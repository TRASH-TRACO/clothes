"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { SLOT_ORDER, isCategory } from "@/lib/categories";
import { isRating } from "@/lib/feedback";
import { findSameOutfit, outfitKey } from "@/lib/outfit-key";
import { outfitTitle } from "@/lib/outfit-title";
import { PHOTO_BUCKET } from "@/lib/supabase/env";
import { createClient, getUser } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

function fail(message: string): ActionState {
  return { ok: false, message };
}

/** formData의 slot_top=<itemId> 형태를 [{slot, item_id}] 로 */
function parseSlots(formData: FormData) {
  const slots: { slot: string; item_id: string }[] = [];
  for (const slot of SLOT_ORDER) {
    const itemId = String(formData.get(`slot_${slot}`) ?? "").trim();
    if (itemId && isCategory(slot)) slots.push({ slot, item_id: itemId });
  }
  return slots;
}

/** 기본 폴더 이름. 사람마다 하나 있고 지울 수 없다 */
const DEFAULT_FOLDER = "기본";

/** 새 폴더 이름 길이 (schema.sql 의 check 와 같게) */
const FOLDER_MAX = 30;

export async function saveOutfit(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // 이름은 선택이다. 매번 짓게 하면 짓기 싫어서 저장을 안 하게 된다.
  // 안 지었으면 들어간 옷으로 부른다 (lib/outfit-title.ts).
  const name = String(formData.get("name") ?? "").trim() || null;

  const slots = parseSlots(formData);
  if (slots.length < 2) return fail("옷을 2개 이상 골라주세요.");

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
  const same = findSameOutfit(
    outfitKey(slots.map((slot) => slot.item_id)),
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

  const { error: itemsError } = await supabase
    .from("outfit_items")
    .insert(slots.map((slot) => ({ ...slot, outfit_id: id })));

  if (itemsError) return fail(itemsError.message);

  // 옷·코디·기록은 홈, 옷장, 코디 만들기, 캘린더에 걸쳐 나온다.
  // 경로를 하나씩 적으면 빠뜨리는 곳이 생기고, 이동 캐시 때문에 옛 값이 남는다.
  // 바꿀 일이 잦지 않으니 통째로 비운다.
  revalidatePath("/", "layout");
  redirect(`/outfits/${id}`);
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
