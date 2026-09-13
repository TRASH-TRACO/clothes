"use server";

import { revalidatePath } from "next/cache";

import { isCategory, measurementFields } from "@/lib/categories";
import { compareSignature, type CompareSide } from "@/lib/compare";
import { COMPARE_LOG_DAYS } from "@/lib/data";
import { createClient, getUser } from "@/lib/supabase/server";

/** 새로 살 옷 이름은 보여주기용이라 길면 자른다 */
const NAME_MAX = 80;

/**
 * 견준 걸 기록에 남긴다.
 *
 * 화면에서 옷을 고를 때마다 자동으로 불린다. 그래서 두 가지를 지킨다.
 *   1. 같은 비교는 줄을 늘리지 않고 시각만 새로 쓴다 (signature 로 덮어쓴다).
 *   2. 실패해도 조용히 넘어간다. 기록은 곁다리고, 비교 자체는 계속 돼야 한다.
 */
export async function saveCompare(
  baseItemId: string,
  other: CompareSide,
): Promise<{ ok: boolean }> {
  const user = await getUser();
  if (!user) return { ok: false };
  if (!baseItemId) return { ok: false };

  const supabase = await createClient();
  const now = new Date();

  let row: Record<string, unknown>;
  if (other.kind === "item") {
    if (!other.itemId || other.itemId === baseItemId) return { ok: false };
    row = { other_item_id: other.itemId };
  } else {
    if (!isCategory(other.category)) return { ok: false };
    // 그 분류에 있는 항목만 남긴다. 분류를 바꿔 가며 적다 남은 값이 섞이면
    // 표에는 안 보이는데 기록에만 들어가서 나중에 헷갈린다.
    const allowed = new Set(measurementFields(other.category).map((field) => field.key));
    const measurements: Record<string, number> = {};
    for (const [key, value] of Object.entries(other.measurements ?? {})) {
      if (!allowed.has(key)) continue;
      if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) continue;
      measurements[key] = value;
    }
    if (Object.keys(measurements).length === 0) return { ok: false };
    row = {
      other_item_id: null,
      other_name: other.name.trim().slice(0, NAME_MAX) || null,
      other_category: other.category,
      other_measurements: measurements,
    };
  }

  const { error } = await supabase.from("compare_logs").upsert(
    {
      ...row,
      user_id: user.id,
      base_item_id: baseItemId,
      signature: compareSignature(baseItemId, other),
      // 다시 견주면 목록 맨 위로 올라와야 한다
      created_at: now.toISOString(),
    },
    { onConflict: "user_id,signature" },
  );
  // 스키마를 아직 안 올렸거나 뭐가 잘못돼도 화면은 그대로 둔다
  if (error) return { ok: false };

  // 일주일 지난 줄은 여기서 치운다. 읽을 때도 걸러내지만 쌓아둘 이유가 없다.
  const cutoff = new Date(now.getTime() - COMPARE_LOG_DAYS * 86_400_000).toISOString();
  await supabase.from("compare_logs").delete().lt("created_at", cutoff);

  revalidatePath("/compare");
  return { ok: true };
}

/** 기록 한 줄 지우기. 잘못 남은 줄을 일주일 동안 보고 있을 이유는 없다 */
export async function removeCompare(id: string): Promise<{ ok: boolean }> {
  const user = await getUser();
  if (!user) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.from("compare_logs").delete().eq("id", id);
  if (error) return { ok: false };
  revalidatePath("/compare");
  return { ok: true };
}
