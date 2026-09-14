"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { SLOT_ORDER, isCategory } from "@/lib/categories";
import { isRating } from "@/lib/feedback";
import { findSameOutfit, outfitKey } from "@/lib/outfit-key";
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

export async function saveOutfit(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return fail("코디 이름을 입력하세요.");

  const slots = parseSlots(formData);
  if (slots.length < 2) return fail("옷을 2개 이상 골라주세요.");

  const memo = String(formData.get("memo") ?? "").trim() || null;
  const photoPath = String(formData.get("photo_path") ?? "").trim() || null;
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

  let id = outfitId;

  if (id) {
    const { error } = await supabase
      .from("outfits")
      .update({ name, memo, photo_path: photoPath, rating })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return fail(error.message);

    const { error: clearError } = await supabase.from("outfit_items").delete().eq("outfit_id", id);
    if (clearError) return fail(clearError.message);
  } else {
    const { data, error } = await supabase
      .from("outfits")
      .insert({ name, memo, photo_path: photoPath, rating, user_id: user.id })
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
    .select("id, name, outfit_items(item_id)")
    .eq("user_id", userId);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    key: outfitKey((row.outfit_items as { item_id: string }[]).map((entry) => entry.item_id)),
  }));
}

export async function deleteOutfit(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const user = await getUser();
  if (!user) return;

  const { data: outfit } = await supabase
    .from("outfits")
    .select("photo_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  await supabase.from("outfits").delete().eq("id", id).eq("user_id", user.id);

  if (outfit?.photo_path) {
    await supabase.storage.from(PHOTO_BUCKET).remove([outfit.photo_path]);
  }

  // 옷·코디·기록은 홈, 옷장, 코디 만들기, 캘린더에 걸쳐 나온다.
  // 경로를 하나씩 적으면 빠뜨리는 곳이 생기고, 이동 캐시 때문에 옛 값이 남는다.
  // 바꿀 일이 잦지 않으니 통째로 비운다.
  revalidatePath("/", "layout");
  redirect("/outfits");
}
