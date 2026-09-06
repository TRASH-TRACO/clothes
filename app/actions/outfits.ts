"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { SLOT_ORDER, isCategory } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";
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

export async function saveOutfit(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return fail("코디 이름을 입력하세요.");

  const slots = parseSlots(formData);
  if (slots.length < 2) return fail("옷을 2개 이상 골라주세요.");

  const memo = String(formData.get("memo") ?? "").trim() || null;
  const outfitId = String(formData.get("outfit_id") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("로그인이 필요합니다.");

  let id = outfitId;

  if (id) {
    const { error } = await supabase
      .from("outfits")
      .update({ name, memo })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return fail(error.message);

    const { error: clearError } = await supabase.from("outfit_items").delete().eq("outfit_id", id);
    if (clearError) return fail(clearError.message);
  } else {
    const { data, error } = await supabase
      .from("outfits")
      .insert({ name, memo, user_id: user.id })
      .select("id")
      .single();
    if (error) return fail(error.message);
    id = data.id;
  }

  const { error: itemsError } = await supabase
    .from("outfit_items")
    .insert(slots.map((slot) => ({ ...slot, outfit_id: id })));

  if (itemsError) return fail(itemsError.message);

  revalidatePath("/outfits");
  revalidatePath("/");
  redirect(`/outfits/${id}`);
}

export async function deleteOutfit(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("outfits").delete().eq("id", id).eq("user_id", user.id);

  revalidatePath("/outfits");
  revalidatePath("/");
  redirect("/outfits");
}
