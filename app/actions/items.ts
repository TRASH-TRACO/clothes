"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isCategory, isKindOf, measurementFields, type Category } from "@/lib/categories";
import { isFit, type Fit } from "@/lib/feedback";
import { PHOTO_BUCKET } from "@/lib/supabase/env";
import { createClient, getUser } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

function fail(message: string): ActionState {
  return { ok: false, message };
}

type ItemValues = {
  category: Category;
  subcategory: string | null;
  name: string;
  brand: string | null;
  color_name: string;
  color_hex: string;
  size_label: string | null;
  fit: Fit | null;
  photo_path: string | null;
  photo_paths: string[];
  notes: string | null;
  measurements: Record<string, number>;
};

type ParseResult =
  { ok: true; values: ItemValues } | { ok: false; message: string };

function parseItem(formData: FormData): ParseResult {
  const category = formData.get("category");
  if (!isCategory(category))
    return { ok: false, message: "카테고리를 선택하세요." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, message: "이름을 입력하세요." };

  const colorName = String(formData.get("color_name") ?? "").trim();
  if (!colorName) return { ok: false, message: "색상을 선택하세요." };

  const measurements: Record<string, number> = {};
  for (const field of measurementFields(category)) {
    const raw = String(formData.get(`m_${field.key}`) ?? "").trim();
    if (!raw) continue;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) {
      return { ok: false, message: `${field.label} 값이 올바르지 않습니다.` };
    }
    measurements[field.key] = value;
  }

  const photos = [
    ...new Set(formData.getAll("photo_paths").map(String).map((v) => v.trim()).filter(Boolean)),
  ];

  const optional = (key: string) => {
    const value = String(formData.get(key) ?? "").trim();
    return value.length > 0 ? value : null;
  };

  return {
    ok: true,
    values: {
      category,
      // 카테고리를 바꾸면 예전 세분류가 딸려올 수 있으니 목록에 있는 값만 받는다
      subcategory: isKindOf(category, formData.get("subcategory"))
        ? String(formData.get("subcategory"))
        : null,
      name,
      brand: optional("brand"),
      color_name: colorName,
      color_hex: String(formData.get("color_hex") ?? "#000000"),
      size_label: optional("size_label"),
      // 목록에 있는 값만 받는다 (DB 쪽에도 같은 검사가 걸려 있다)
      fit: isFit(formData.get("fit")) ? (formData.get("fit") as Fit) : null,
      // 첫 장이 대표 사진. 목록·카드는 photo_path 만 보므로 같이 채운다.
      photo_path: photos[0] ?? null,
      photo_paths: photos,
      notes: optional("notes"),
      measurements,
    },
  };
}

/**
 * 표기만 다른 같은 브랜드가 늘어나지 않게, 이미 쓰던 표기가 있으면 그쪽을 따른다.
 * (carhartt 로 넣어도 이미 Carhartt 가 있으면 Carhartt 로 저장된다)
 * 폼에서 고르지 않고 직접 친 경우까지 막기 위한 마지막 방어선이다.
 */
async function canonicalBrand(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  brand: string | null,
): Promise<string | null> {
  if (!brand) return null;

  // ilike의 와일드카드로 해석되지 않게 escape 한다
  const pattern = brand.replace(/[\\%_]/g, (match) => `\\${match}`);
  const { data } = await supabase
    .from("items")
    .select("brand")
    .eq("user_id", userId)
    .ilike("brand", pattern)
    .limit(1)
    .maybeSingle();

  return data?.brand ?? brand;
}

export async function createItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseItem(formData);
  if (!parsed.ok) return fail(parsed.message);

  const supabase = await createClient();
  const user = await getUser();
  if (!user) return fail("로그인이 필요합니다.");

  const brand = await canonicalBrand(supabase, user.id, parsed.values.brand);
  const { data, error } = await supabase
    .from("items")
    .insert({ ...parsed.values, brand, user_id: user.id })
    .select("id")
    .single();

  if (error) return fail(error.message);

  // 옷·코디·기록은 홈, 옷장, 코디 만들기, 캘린더에 걸쳐 나온다.
  // 경로를 하나씩 적으면 빠뜨리는 곳이 생기고, 이동 캐시 때문에 옛 값이 남는다.
  // 바꿀 일이 잦지 않으니 통째로 비운다.
  revalidatePath("/", "layout");
  redirect(`/closet/${data.id}`);
}

export async function updateItem(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("잘못된 요청입니다.");

  const parsed = parseItem(formData);
  if (!parsed.ok) return fail(parsed.message);

  const supabase = await createClient();
  const user = await getUser();
  if (!user) return fail("로그인이 필요합니다.");

  const brand = await canonicalBrand(supabase, user.id, parsed.values.brand);
  const { error } = await supabase
    .from("items")
    .update({ ...parsed.values, brand })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return fail(error.message);

  // 옷·코디·기록은 홈, 옷장, 코디 만들기, 캘린더에 걸쳐 나온다.
  // 경로를 하나씩 적으면 빠뜨리는 곳이 생기고, 이동 캐시 때문에 옛 값이 남는다.
  // 바꿀 일이 잦지 않으니 통째로 비운다.
  revalidatePath("/", "layout");
  redirect(`/closet/${id}`);
}

export async function deleteItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const user = await getUser();
  if (!user) return;

  const { data: item } = await supabase
    .from("items")
    .select("photo_path, photo_paths")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  await supabase.from("items").delete().eq("id", id).eq("user_id", user.id);

  // 여러 장 올렸으면 다 지운다 (대표 사진만 지우면 나머지가 남는다)
  const files = [...new Set([...(item?.photo_paths ?? []), item?.photo_path])].filter(
    (path): path is string => Boolean(path),
  );
  if (files.length > 0) {
    await supabase.storage.from(PHOTO_BUCKET).remove(files);
  }

  // 옷·코디·기록은 홈, 옷장, 코디 만들기, 캘린더에 걸쳐 나온다.
  // 경로를 하나씩 적으면 빠뜨리는 곳이 생기고, 이동 캐시 때문에 옛 값이 남는다.
  // 바꿀 일이 잦지 않으니 통째로 비운다.
  revalidatePath("/", "layout");
  redirect("/closet");
}

/**
 * 이제 안 입는 옷을 보관함으로 보낸다.
 *
 * 지우지 않는 이유: 다음에 옷 살 때 "그 브랜드 M 은 작았지" 를 보려는 것이다.
 * 지난 착용 기록도 그대로 남는다 — 기록은 기록이다.
 */
export async function archiveItem(formData: FormData) {
  await setArchived(formData, new Date().toISOString());
}

/** 다시 입기로 했다. 옷장으로 되돌린다 */
export async function unarchiveItem(formData: FormData) {
  await setArchived(formData, null);
}

async function setArchived(formData: FormData, value: string | null) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const user = await getUser();
  if (!user) return;

  await supabase
    .from("items")
    .update({ archived_at: value })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/", "layout");
  redirect(`/closet/${id}`);
}
