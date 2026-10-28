"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isCategory, measurementFields } from "@/lib/categories";
import { safeUrl } from "@/lib/safe-url";
import { PHOTO_BUCKET } from "@/lib/supabase/env";
import { createClient, getUser } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

function fail(message: string): ActionState {
  return { ok: false, message };
}

/** 이름 길이 (schema.sql 의 check 와 같게) */
const NAME_MAX = 80;

/**
 * 값 하나만 읽어 다듬는다. 빈 칸은 null 이다 — 빈 글자를 넣어 두면
 * "안 적은 것" 과 "빈칸을 적은 것" 이 DB 에서 구별이 안 된다.
 */
function text(formData: FormData, key: string, max = 200): string | null {
  const value = String(formData.get(key) ?? "").trim();
  return value ? value.slice(0, max) : null;
}

/**
 * 값. 원 단위 정수만 받는다.
 *
 * 사람은 "129,000" 이나 "129000원" 처럼 적는다. 숫자만 남겨서 읽는다.
 */
function parsePrice(formData: FormData): number | null {
  const raw = String(formData.get("price") ?? "").replace(/[^0-9]/g, "");
  if (!raw) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

/** 상품 페이지에 적힌 실측. 분류를 정했을 때만 그 분류의 칸을 읽는다 */
function parseMeasurements(formData: FormData, category: string | null) {
  const out: Record<string, number> = {};
  if (!isCategory(category)) return out;
  for (const field of measurementFields(category)) {
    const raw = String(formData.get(`m_${field.key}`) ?? "").trim();
    if (!raw) continue;
    const value = Number(raw);
    if (Number.isFinite(value) && value > 0) out[field.key] = value;
  }
  return out;
}

/**
 * 장바구니에 담기 / 고치기.
 *
 * 이름만 있으면 저장된다. 링크도 값도 나중에 채울 수 있다 — 보다가 급히
 * 담아 두는 자리라, 여기서 다 적으라고 하면 안 담게 된다.
 */
export async function saveCartItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return fail("이름을 적어주세요.");

  const supabase = await createClient();
  const user = await getUser();
  if (!user) return fail("로그인이 필요합니다.");

  const rawCategory = formData.get("category");
  const category = isCategory(rawCategory) ? rawCategory : null;

  const values = {
    name: name.slice(0, NAME_MAX),
    // 적어 준 그대로가 아니라 **걸 수 있는 모양으로** 다듬어 둔다.
    // 화면에서도 한 번 더 거르지만, 못 거는 주소를 담아 둘 이유가 없다.
    url: safeUrl(text(formData, "url", 2000)),
    brand: text(formData, "brand", 60),
    category,
    price: parsePrice(formData),
    memo: text(formData, "memo", 300),
    photo_path: text(formData, "photo_path", 300),
    measurements: parseMeasurements(formData, category),
  };

  const id = String(formData.get("id") ?? "").trim();

  if (id) {
    const { error } = await supabase
      .from("cart_items")
      .update(values)
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return fail(error.message);
  } else {
    const { error } = await supabase.from("cart_items").insert({ ...values, user_id: user.id });
    if (error) return fail(error.message);
  }

  revalidatePath("/", "layout");
  redirect("/cart");
}

/**
 * 샀다 / 안 샀다 뒤집기.
 *
 * 산 것도 지우지 않고 목록 아래로 내린다. 지워 버리면 같은 걸 또 담게 된다.
 */
export async function toggleBought(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const supabase = await createClient();
  const user = await getUser();
  if (!user) return;

  const { data } = await supabase
    .from("cart_items")
    .select("bought_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return;

  await supabase
    .from("cart_items")
    .update({ bought_at: data.bought_at ? null : new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/", "layout");
}

export async function deleteCartItem(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;

  const supabase = await createClient();
  const user = await getUser();
  if (!user) return;

  // 사진은 담은 사람 폴더에 있다. 줄을 지우면 쓸 데가 없으니 같이 지운다.
  const { data } = await supabase
    .from("cart_items")
    .select("photo_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  await supabase.from("cart_items").delete().eq("id", id).eq("user_id", user.id);

  if (data?.photo_path) {
    await supabase.storage.from(PHOTO_BUCKET).remove([data.photo_path]);
  }

  revalidatePath("/", "layout");
  redirect("/cart");
}
