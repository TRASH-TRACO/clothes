"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isValidDate, monthOf } from "@/lib/calendar";
import { createClient, getUser } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

function fail(message: string): ActionState {
  return { ok: false, message };
}

/**
 * 그날 입은 옷을 저장한다. 하루에 한 줄이라 같은 날짜면 덮어쓴다.
 * 코디를 골랐어도 구성 옷을 복사해 두므로, 나중에 코디를 고쳐도 지난 기록은 그대로다.
 */
export async function saveWearLog(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const date = String(formData.get("worn_on") ?? "");
  if (!isValidDate(date)) return fail("날짜가 올바르지 않습니다.");

  const itemIds = [...new Set(formData.getAll("item_ids").map(String).filter(Boolean))];
  if (itemIds.length === 0) return fail("입은 옷을 하나 이상 골라주세요.");

  const memo = String(formData.get("memo") ?? "").trim() || null;
  const requestedOutfit = String(formData.get("outfit_id") ?? "").trim() || null;

  const supabase = await createClient();
  const user = await getUser();
  if (!user) return fail("로그인이 필요합니다.");

  // 남의 코디 id가 들어오면 그냥 연결을 끊는다 (기록 자체는 살린다)
  let outfitId: string | null = null;
  if (requestedOutfit) {
    const { data } = await supabase
      .from("outfits")
      .select("id")
      .eq("id", requestedOutfit)
      .eq("user_id", user.id)
      .maybeSingle();
    outfitId = data?.id ?? null;
  }

  const { data: log, error } = await supabase
    .from("wear_logs")
    .upsert(
      { user_id: user.id, worn_on: date, outfit_id: outfitId, memo },
      { onConflict: "user_id,worn_on" },
    )
    .select("id")
    .single();
  if (error) return fail(error.message);

  const { error: clearError } = await supabase
    .from("wear_log_items")
    .delete()
    .eq("wear_log_id", log.id);
  if (clearError) return fail(clearError.message);

  const { error: itemsError } = await supabase
    .from("wear_log_items")
    .insert(itemIds.map((itemId) => ({ wear_log_id: log.id, item_id: itemId })));
  if (itemsError) return fail(itemsError.message);

  revalidatePath("/calendar");
  revalidatePath(`/calendar/${date}`);
  redirect(`/calendar?m=${monthOf(date)}`);
}

export async function deleteWearLog(formData: FormData) {
  const date = String(formData.get("worn_on") ?? "");
  if (!isValidDate(date)) return;

  const supabase = await createClient();
  const user = await getUser();
  if (!user) return;

  await supabase.from("wear_logs").delete().eq("user_id", user.id).eq("worn_on", date);

  revalidatePath("/calendar");
  revalidatePath(`/calendar/${date}`);
  redirect(`/calendar?m=${monthOf(date)}`);
}
