"use server";

import { pickSimilar, type Candidate } from "@/lib/similar-day";
import { createClient, getUser } from "@/lib/supabase/server";
import { weatherKind } from "@/lib/weather-codes";

/** DB 에서 몇 줄이나 받아올지. 기온으로 추린 뒤 날씨 종류로 한 번 더 고른다 */
const SHORTLIST = 8;

export type SimilarDay = {
  /** YYYY-MM-DD */
  date: string;
  code: number;
  high: number;
  low: number;
  /** 그날 입은 옷 id. 옷 자체는 캘린더가 이미 들고 있다 */
  itemIds: string[];
};

type Row = {
  on_date: string;
  code: number | null;
  temp_high: number;
  temp_low: number;
  item_ids: string[] | null;
};

/**
 * 이 날씨와 가장 비슷했던 날.
 *
 * **왕복 한 번으로 끝난다.** 기온 차로 줄 세우는 건 DB 가 하고
 * (supabase/schema.sql 의 similar_days), 입은 옷 id 까지 같이 실려 온다.
 * 옷 자체는 캘린더 레이아웃이 이미 받아 둔 목록에서 찾아 쓰므로 더 부를 게 없다.
 *
 * 날짜를 누를 때만 부른다. 달을 넘길 때마다 미리 받아 두면 눌러 보지도 않을 날까지
 * 계산하게 된다.
 */
export async function findSimilarDay(
  date: string,
  high: number,
  low: number,
  code: number,
): Promise<SimilarDay | null> {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("similar_days", {
    p_date: date,
    p_high: high,
    p_low: low,
    p_want: SHORTLIST,
  });

  // 스키마를 아직 안 올렸으면 함수가 없다. 추천만 빠지고 나머지는 그대로 쓴다.
  if (error || !data) {
    if (error) console.error("[similar] similar_days", error.message);
    return null;
  }

  const candidates: Candidate[] = (data as Row[]).map((row) => ({
    date: row.on_date,
    high: row.temp_high,
    low: row.temp_low,
    kind: weatherKind(row.code ?? 0),
    itemIds: row.item_ids ?? [],
  }));

  const best = pickSimilar({ high, low, kind: weatherKind(code) }, candidates);
  if (!best) return null;

  const row = (data as Row[]).find((entry) => entry.on_date === best.date);
  return {
    date: best.date,
    code: row?.code ?? 0,
    high: best.high,
    low: best.low,
    itemIds: best.itemIds,
  };
}
