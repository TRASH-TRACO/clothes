"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { isValidDate, monthOf } from "@/lib/calendar";
import { isFelt } from "@/lib/feedback";
import { isPlace, roundPlace } from "@/lib/places";
import { dropStoredDay, storeDay } from "@/lib/weather-store";
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

  // 그날 있던 곳. 안 고르면 기본 지역을 쓴다는 뜻이라 null로 둔다.
  const candidate = {
    name: String(formData.get("place_name") ?? "").trim(),
    lat: Number(formData.get("place_lat")),
    lon: Number(formData.get("place_lon")),
  };
  const place = isPlace(candidate) ? roundPlace(candidate) : null;

  // 옷을 안 골라도 "이 날은 부산에 있었다"만 남길 수 있어야 한다
  if (itemIds.length === 0 && !place) {
    return fail("입은 옷을 고르거나, 그날 있던 지역을 남겨주세요.");
  }

  const memo = String(formData.get("memo") ?? "").trim() || null;
  const feltInput = formData.get("felt");
  const felt = isFelt(feltInput) ? feltInput : null;
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
      {
        user_id: user.id,
        worn_on: date,
        outfit_id: outfitId,
        memo,
        felt,
        place_name: place?.name ?? null,
        place_lat: place?.lat ?? null,
        place_lon: place?.lon ?? null,
      },
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

  if (itemIds.length > 0) {
    const { error: itemsError } = await supabase
      .from("wear_log_items")
      .insert(itemIds.map((itemId) => ({ wear_log_id: log.id, item_id: itemId })));
    if (itemsError) return fail(itemsError.message);
  }

  // 지역을 정한 날은 그 지역 날씨를 받아 저장해 두고, 지운 날은 저장분도 버린다
  // (지우면 다시 기본 지역으로 본다)
  await (place ? storeDay(date, place) : dropStoredDay(date));

  // 옷·코디·기록은 홈, 옷장, 코디 만들기, 캘린더에 걸쳐 나온다.
  // 경로를 하나씩 적으면 빠뜨리는 곳이 생기고, 이동 캐시 때문에 옛 값이 남는다.
  // 바꿀 일이 잦지 않으니 통째로 비운다.
  revalidatePath("/", "layout");
  redirect(`/calendar?m=${monthOf(date)}`);
}

export async function deleteWearLog(formData: FormData) {
  const date = String(formData.get("worn_on") ?? "");
  if (!isValidDate(date)) return;

  const supabase = await createClient();
  const user = await getUser();
  if (!user) return;

  await supabase.from("wear_logs").delete().eq("user_id", user.id).eq("worn_on", date);

  // 지역 기록도 같이 사라지므로 저장분을 버리고 기본 지역으로 되돌린다
  await dropStoredDay(date);

  // 옷·코디·기록은 홈, 옷장, 코디 만들기, 캘린더에 걸쳐 나온다.
  // 경로를 하나씩 적으면 빠뜨리는 곳이 생기고, 이동 캐시 때문에 옛 값이 남는다.
  // 바꿀 일이 잦지 않으니 통째로 비운다.
  revalidatePath("/", "layout");
  redirect(`/calendar?m=${monthOf(date)}`);
}
