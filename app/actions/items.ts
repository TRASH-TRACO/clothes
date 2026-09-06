"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isCategory, measurementFields, type Category } from "@/lib/categories";
import { PHOTO_BUCKET } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

function fail(message: string): ActionState {
  return { ok: false, message };
}

type ItemValues = {
  category: Category;
  name: string;
  brand: string | null;
  color_name: string;
  color_hex: string;
  size_label: string | null;
  photo_path: string | null;
  notes: string | null;
  measurements: Record<string, number>;
};

type ParseResult = { ok: true; values: ItemValues } | { ok: false; message: string };

function parseItem(formData: FormData): ParseResult {
  const category = formData.get("category");
  if (!isCategory(category)) return { ok: false, message: "카테고리를 선택하세요." };

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

export async function createItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseItem(formData);
  if (!parsed.ok) return fail(parsed.message);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("로그인이 필요합니다.");

  const { data, error } = await supabase
    .from("items")
    .insert({ ...parsed.values, user_id: user.id })
    .select("id")
    .single();

  if (error) return fail(error.message);

  revalidatePath("/closet");
  revalidatePath("/");
  redirect(`/closet/${data.id}`);
}

export async function updateItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return fail("잘못된 요청입니다.");

  const parsed = parseItem(formData);
  if (!parsed.ok) return fail(parsed.message);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("로그인이 필요합니다.");

  const { error } = await supabase
    .from("items")
    .update(parsed.values)
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
