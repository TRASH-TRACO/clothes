"use server";

import { revalidatePath } from "next/cache";

import { isPlace, roundPlace, type Place } from "@/lib/places";
import { createClient, getUser } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

/**
 * 지명으로 좌표 찾기. open-meteo의 지오코딩이라 키가 필요 없다.
 * 실패하면 빈 배열 — 그때는 자주 쓰는 지역 목록에서 고르면 된다.
 */
export async function searchPlaces(query: string): Promise<Place[]> {
  const name = query.trim();
  if (name.length < 2) return [];

  const url =
    "https://geocoding-api.open-meteo.com/v1/search" +
    `?name=${encodeURIComponent(name)}&count=6&language=ko&format=json`;

  try {
    const response = await fetch(url, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return [];

    const payload = (await response.json()) as { results?: unknown };
    if (!Array.isArray(payload.results)) return [];

    return payload.results
      .map((row) => {
        const entry = row as Record<string, unknown>;
        // "속초" 처럼 같은 이름이 여럿이라 행정구역·나라를 붙여 구분한다
        const parts = [entry.name, entry.admin1, entry.country]
          .filter((part): part is string => typeof part === "string" && part.length > 0)
          .filter((part, i, list) => list.indexOf(part) === i);
        return { name: parts.join(", "), lat: entry.latitude, lon: entry.longitude };
      })
      .filter(isPlace)
      .map(roundPlace);
  } catch {
    return [];
  }
}

function fail(message: string): ActionState {
  return { ok: false, message };
}

/** 기본 지역 저장 */
export async function saveBasePlace(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const place = {
    name: String(formData.get("place_name") ?? "").trim(),
    lat: Number(formData.get("place_lat")),
    lon: Number(formData.get("place_lon")),
  };
  if (!isPlace(place)) return fail("지역을 골라주세요.");

  const supabase = await createClient();
  const user = await getUser();
  if (!user) return fail("로그인이 필요합니다.");

  const rounded = roundPlace(place);
  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      place_name: rounded.name,
      place_lat: rounded.lat,
      place_lon: rounded.lon,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return fail(error.message);

  revalidatePath("/", "layout");
  return { ok: true, message: `기본 지역을 ${rounded.name}(으)로 정했습니다.` };
}
