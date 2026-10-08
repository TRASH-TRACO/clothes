"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isCategory, type Category } from "@/lib/categories";
import { isRating } from "@/lib/feedback";
import { isMissingColumn } from "@/lib/data";
import { findSameOutfit, outfitKey } from "@/lib/outfit-key";
import { outfitTitle } from "@/lib/outfit-title";
import { PHOTO_BUCKET } from "@/lib/supabase/env";
import { createClient, getUser } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

function fail(message: string): ActionState {
  return { ok: false, message };
}

/**
 * 고른 옷 id. 보내온 순서를 그대로 지킨다 — 같은 분류 안에서는 그 순서가
 * **안에서 겉으로** 겹쳐 입은 순서(layer)가 된다.
 *
 * 같은 옷이 두 번 실려 와도 한 번만 센다 (한 벌을 두 번 입을 수는 없다).
 */
function parseItemIds(formData: FormData): string[] {
  const seen = new Set<string>();
  for (const value of formData.getAll("item_ids")) {
    const id = String(value).trim();
    if (id) seen.add(id);
  }
  return [...seen];
}

/**
 * 고른 옷을 outfit_items 줄로.
 *
 * **분류는 DB 에서 읽는다.** 예전에는 화면이 `slot_top=<id>` 로 자리까지 알려줬는데,
 * 그건 보내는 쪽을 믿는 것이다. 어차피 내 옷인지 확인해야 하므로 그 자리에서
 * 분류도 같이 받아 온다.
 */
async function toRows(
  supabase: SupabaseClient,
  userId: string,
  itemIds: string[],
): Promise<{ outfit_id?: string; item_id: string; slot: Category; layer: number }[] | null> {
  const { data, error } = await supabase
    .from("items")
    .select("id, category")
    .eq("user_id", userId)
    .in("id", itemIds);
  if (error || !data) return null;

  const categoryOf = new Map<string, string>(data.map((row) => [row.id, row.category]));
  // 하나라도 내 옷이 아니면 저장하지 않는다. 일부만 들어가면 조합이 달라진다.
  if (categoryOf.size !== itemIds.length) return null;

  const used = new Map<Category, number>();
  const rows = [];
  for (const itemId of itemIds) {
    const category = categoryOf.get(itemId);
    if (!isCategory(category)) return null;
    const layer = used.get(category) ?? 0;
    used.set(category, layer + 1);
    rows.push({ item_id: itemId, slot: category, layer });
  }
  return rows;
}

/** 기본 폴더 이름. 사람마다 하나 있고 지울 수 없다 */
const DEFAULT_FOLDER = "기본";

/** 새 폴더 이름 길이 (schema.sql 의 check 와 같게) */
const FOLDER_MAX = 30;

export async function saveOutfit(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // 이름은 선택이다. 매번 짓게 하면 짓기 싫어서 저장을 안 하게 된다.
  // 안 지었으면 들어간 옷으로 부른다 (lib/outfit-title.ts).
  const name = String(formData.get("name") ?? "").trim() || null;

  const itemIds = parseItemIds(formData);
  if (itemIds.length < 2) return fail("옷을 2개 이상 골라주세요.");

  const memo = String(formData.get("memo") ?? "").trim() || null;
  // 사진은 여러 장이다. 같은 경로가 두 번 실려 와도 한 번만 센다.
  const photos = [
    ...new Set(
      formData
        .getAll("photo_paths")
        .map(String)
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
  const ratingInput = formData.get("rating");
  const rating = isRating(ratingInput) ? ratingInput : null;
  const outfitId = String(formData.get("outfit_id") ?? "").trim();

  const supabase = await createClient();
  const user = await getUser();
  if (!user) return fail("로그인이 필요합니다.");

  // 같은 조합이 이미 있으면 한 벌 더 만들지 않는다. 저장한 코디에도, 캘린더에도,
  // AI 추천에도 똑같은 게 둘씩 뜨면 고를 때마다 어느 쪽인지 확인해야 한다.
  // 화면에서도 고르는 동안 미리 알려주지만 (components/outfit-builder.tsx),
  // 탭을 두 개 띄워 두면 그 목록이 낡을 수 있어 여기서 한 번 더 본다.
  const rows = await toRows(supabase, user.id, itemIds);
  if (!rows) return fail("고른 옷을 확인하지 못했습니다. 다시 골라주세요.");

  const same = findSameOutfit(
    outfitKey(itemIds),
    await knownOutfits(supabase, user.id),
    outfitId || null,
  );
  if (same) {
    return {
      ok: false,
      message: `같은 조합의 코디가 이미 있습니다 — "${same.name}".`,
      link: { href: `/outfits/${same.id}`, label: "그 코디 보기" },
    };
  }

  // 폴더만 정하면 저장된다. 안 정했으면 기본 폴더로 간다.
  const folderId = await pickFolder(supabase, user.id, formData);
  if (folderId === null) return fail("폴더를 만들지 못했습니다. 이름이 겹치지 않는지 확인해 주세요.");

  let id = outfitId;

  if (id) {
    const { error } = await supabase
      .from("outfits")
      // 첫 장이 대표 사진. 목록 카드는 photo_path 만 보므로 같이 채운다.
      .update({
        name,
        memo,
        photo_path: photos[0] ?? null,
        photo_paths: photos,
        rating,
        folder_id: folderId,
      })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return fail(error.message);

    const { error: clearError } = await supabase.from("outfit_items").delete().eq("outfit_id", id);
    if (clearError) return fail(clearError.message);
  } else {
    const { data, error } = await supabase
      .from("outfits")
      .insert({
        name,
        memo,
        photo_path: photos[0] ?? null,
        photo_paths: photos,
        rating,
        folder_id: folderId,
        user_id: user.id,
      })
      .select("id")
      .single();
    if (error) return fail(error.message);
    id = data.id;
  }

  const itemsError = await insertItems(supabase, id, rows);
  if (itemsError) return fail(itemsError);

  // 옷·코디·기록은 홈, 옷장, 코디 만들기, 캘린더에 걸쳐 나온다.
  // 경로를 하나씩 적으면 빠뜨리는 곳이 생기고, 이동 캐시 때문에 옛 값이 남는다.
  // 바꿀 일이 잦지 않으니 통째로 비운다.
  revalidatePath("/", "layout");
  redirect(`/outfits/${id}`);
}

/**
 * 코디 구성을 넣는다. 실패하면 사람이 읽을 이유를, 성공하면 null.
 *
 * **schema.sql 16 번을 아직 안 돌렸을 수 있다.** 그때는 layer 칸이 없고, 분류당
 * 한 벌만 넣을 수 있는 옛 제약이 그대로 걸려 있다. 겹쳐 입기만 못 하게 막고
 * 나머지는 예전처럼 저장되게 한다.
 */
async function insertItems(
  supabase: SupabaseClient,
  outfitId: string,
  rows: { item_id: string; slot: Category; layer: number }[],
): Promise<string | null> {
  const { error } = await supabase
    .from("outfit_items")
    .insert(rows.map((row) => ({ ...row, outfit_id: outfitId })));
  if (!error) return null;

  if (!isMissingColumn(error)) return error.message;

  // layer 칸이 없으면 그것만 빼고 다시 넣는다
  const { error: plainError } = await supabase
    .from("outfit_items")
    .insert(rows.map(({ item_id, slot }) => ({ item_id, slot, outfit_id: outfitId })));
  if (!plainError) return null;

  // 옛 제약(분류당 한 벌)에 걸렸다. 무엇을 해야 하는지 그대로 말해 준다.
  if (plainError.code === "23505") {
    return "겹쳐 입은 코디를 저장하려면 supabase/schema.sql 의 16번을 먼저 실행해 주세요. 그전까지는 분류당 한 벌만 담을 수 있습니다.";
  }
  return plainError.message;
}

/** 이미 저장해 둔 코디들을 조합만 남기고 가져온다 */
async function knownOutfits(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from("outfits")
    .select("id, name, outfit_items(item_id, items(name))")
    .eq("user_id", userId);

  return (data ?? []).map((row) => {
    // PostgREST 타입이 조인을 배열로 잡아서 한 번 풀어 준다
    const entries = row.outfit_items as unknown as {
      item_id: string;
      items: { name: string } | null;
    }[];
    return {
      id: row.id as string,
      // 이름을 안 지은 코디도 "이미 있습니다 — …" 로 부를 이름이 있어야 한다
      name: outfitTitle(
        row.name as string | null,
        entries.map((entry) => entry.items?.name ?? "").filter(Boolean),
      ),
      key: outfitKey(entries.map((entry) => entry.item_id)),
    };
  });
}

/**
 * 기본 폴더. 없으면 만든다.
 *
 * 회원가입 때 만들지 않고 처음 쓸 때 만든다 — 이미 쓰고 있던 사람도 있고,
 * 폴더를 한 번도 안 볼 사람에게 빈 줄을 미리 만들어 둘 이유도 없다.
 */
async function defaultFolder(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("outfit_folders")
    .select("id")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();
  if (data?.id) return data.id as string;

  const { data: made, error } = await supabase
    .from("outfit_folders")
    .insert({ user_id: userId, name: DEFAULT_FOLDER, is_default: true })
    .select("id")
    .single();
  if (!error && made?.id) return made.id as string;

  // 탭을 둘 띄워 두면 동시에 만들려다 유니크 인덱스에 걸린다. 그때는 남이 만든 걸 쓴다.
  const { data: again } = await supabase
    .from("outfit_folders")
    .select("id")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();
  return (again?.id as string) ?? null;
}

/** 폼이 고른 폴더. 새 폴더 이름을 적었으면 만들어서 그걸 쓴다 */
async function pickFolder(
  supabase: SupabaseClient,
  userId: string,
  formData: FormData,
): Promise<string | null> {
  const fresh = String(formData.get("folder_new") ?? "").trim().slice(0, FOLDER_MAX);
  if (fresh) {
    const { data } = await supabase
      .from("outfit_folders")
      .insert({ user_id: userId, name: fresh })
      .select("id")
      .single();
    if (data?.id) return data.id as string;

    // 같은 이름이 이미 있으면 그걸 쓴다. 이름이 겹쳤다고 저장을 막을 이유가 없다.
    const { data: existing } = await supabase
      .from("outfit_folders")
      .select("id")
      .eq("user_id", userId)
      .eq("name", fresh)
      .maybeSingle();
    if (existing?.id) return existing.id as string;
    return null;
  }

  const chosen = String(formData.get("folder_id") ?? "").trim();
  if (chosen) {
    // 남의 폴더 id 를 적어 넣을 수 있으므로 내 것인지 확인한다 (RLS 가 막지만 여기서도 본다)
    const { data } = await supabase
      .from("outfit_folders")
      .select("id")
      .eq("id", chosen)
      .eq("user_id", userId)
      .maybeSingle();
    if (data?.id) return data.id as string;
  }

  return defaultFolder(supabase, userId);
}

/** 폴더 만들기 (저장한 코디 화면에서) */
export async function addOutfitFolder(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, FOLDER_MAX);
  if (!name) return;

  const supabase = await createClient();
  const user = await getUser();
  if (!user) return;

  // 기본 폴더가 없으면 같이 만들어 둔다. 폴더 화면을 먼저 여는 사람도 있다.
  await defaultFolder(supabase, user.id);
  await supabase.from("outfit_folders").insert({ user_id: user.id, name });
  revalidatePath("/", "layout");
}

/**
 * 폴더 지우기.
 *
 * 안에 있던 코디는 기본 폴더로 옮긴다. 폴더를 정리하다가 코디가 사라지면 안 된다.
 * 기본 폴더 자체는 지울 수 없다 — 갈 곳이 없어진다.
 */
export async function removeOutfitFolder(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const supabase = await createClient();
  const user = await getUser();
  if (!user) return;

  const { data: folder } = await supabase
    .from("outfit_folders")
    .select("id, is_default")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!folder || folder.is_default) return;

  const home = await defaultFolder(supabase, user.id);
  if (home) {
    await supabase
      .from("outfits")
      .update({ folder_id: home })
      .eq("folder_id", id)
      .eq("user_id", user.id);
  }
  await supabase.from("outfit_folders").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/", "layout");
}

export async function deleteOutfit(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const user = await getUser();
  if (!user) return;

  const { data: outfit } = await supabase
    .from("outfits")
    .select("photo_path, photo_paths")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  await supabase.from("outfits").delete().eq("id", id).eq("user_id", user.id);

  // 여러 장 올렸으면 다 지운다 (대표 사진만 지우면 나머지가 남는다)
  const files = [...new Set([...(outfit?.photo_paths ?? []), outfit?.photo_path])].filter(
    (path): path is string => Boolean(path),
  );
  if (files.length > 0) {
    await supabase.storage.from(PHOTO_BUCKET).remove(files);
  }

  // 옷·코디·기록은 홈, 옷장, 코디 만들기, 캘린더에 걸쳐 나온다.
  // 경로를 하나씩 적으면 빠뜨리는 곳이 생기고, 이동 캐시 때문에 옛 값이 남는다.
  // 바꿀 일이 잦지 않으니 통째로 비운다.
  revalidatePath("/", "layout");
  redirect("/outfits");
}
