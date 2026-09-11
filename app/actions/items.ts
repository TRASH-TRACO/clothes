"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isCategory, isKindOf, measurementFields, type Category } from "@/lib/categories";
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
  photo_path: string | null;
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
      photo_path: optional("photo_path"),
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

  revalidatePath("/closet");
  revalidatePath("/");
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

  revalidatePath("/closet");
  revalidatePath(`/closet/${id}`);
  revalidatePath("/outfits");
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
    .select("photo_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  await supabase.from("items").delete().eq("id", id).eq("user_id", user.id);

  if (item?.photo_path) {
    await supabase.storage.from(PHOTO_BUCKET).remove([item.photo_path]);
  }

  revalidatePath("/closet");
  revalidatePath("/outfits");
  revalidatePath("/");
  redirect("/closet");
}
