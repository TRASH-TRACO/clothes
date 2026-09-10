import "server-only";

import { addDays, seoulToday } from "./calendar";
import { isPlace, roundPlace, placeKey, type Place } from "./places";
import { isSupabaseConfigured } from "./supabase/env";
import { createClient, getUser } from "./supabase/server";
import { getDailyRange, getDailyRangeByPlace, type DayWeather } from "./weather";

/** 예보 API가 지난 날씨를 주는 한계. 이보다 옛날은 받아올 방법이 없다 */
const MAX_PAST_DAYS = 92;

/** 저장해 둔 하루치 날씨. 어느 지역 기준이었는지도 같이 남는다 */
export type StoredDay = DayWeather & { place: Place };

type Row = {
  on_date: string;
  place_name: string;
  place_lat: number;
  place_lon: number;
  code: number | null;
  temp_high: number | null;
  temp_low: number | null;
  rain_amount: number | null;
};

function toStored(row: Row): StoredDay | null {
  const place = { name: row.place_name, lat: row.place_lat, lon: row.place_lon };
  if (!isPlace(place)) return null;
  return {
    place: roundPlace(place),
    code: row.code ?? 0,
    high: row.temp_high,
    low: row.temp_low,
    rainAmount: row.rain_amount,
  };
}

/** 저장해 둔 구간의 날씨 (양 끝 포함) */
export async function readStoredWeather(from: string, to: string): Promise<Map<string, StoredDay>> {
  const result = new Map<string, StoredDay>();
  if (!isSupabaseConfigured()) return result;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_weather")
    .select("on_date, place_name, place_lat, place_lon, code, temp_high, temp_low, rain_amount")
    .gte("on_date", from)
    .lte("on_date", to);

  // 아직 마이그레이션을 안 돌렸으면 저장된 게 없는 것처럼 군다
  if (error || !data) return result;

  for (const row of data as Row[]) {
    const stored = toStored(row);
    if (stored) result.set(row.on_date, stored);
  }
  return result;
}

async function upsert(rows: (Row & { user_id: string })[]) {
  if (rows.length === 0) return;
  const supabase = await createClient();
  await supabase.from("daily_weather").upsert(rows, { onConflict: "user_id,on_date" });
}

function toRow(userId: string, date: string, place: Place, day: DayWeather) {
  return {
    user_id: userId,
    on_date: date,
    place_name: place.name,
    place_lat: place.lat,
    place_lon: place.lon,
    code: day.code,
    temp_high: day.high,
    temp_low: day.low,
    rain_amount: day.rainAmount,
  };
}

/**
 * 아직 저장 안 된 지난 날짜를 채운다. 여기서만 지난 날씨를 API로 부른다.
 * 지역이 같은 날짜끼리 묶어 한 번씩만 부르고, 받은 값은 바로 저장한다.
 */
export async function fillPastWeather(
  dates: string[],
  placeOf: (date: string) => Place,
): Promise<Map<string, StoredDay>> {
  const filled = new Map<string, StoredDay>();
  if (!isSupabaseConfigured()) return filled;

  // API가 못 주는 옛날 날짜는 부르지 않는다. 부르면 매번 빈손으로 돌아와
  // 그 달을 열 때마다 헛되이 호출하게 된다.
  const oldest = addDays(seoulToday(), -MAX_PAST_DAYS);
  const targets = dates.filter((date) => date >= oldest);
  if (targets.length === 0) return filled;

  const user = await getUser();
  if (!user) return filled;

  const groups = new Map<string, { place: Place; dates: string[] }>();
  for (const date of targets) {
    const place = placeOf(date);
    const key = placeKey(place);
    const group = groups.get(key);
    if (group) group.dates.push(date);
    else groups.set(key, { place, dates: [date] });
  }

  const rows: (Row & { user_id: string })[] = [];
  await Promise.all(
    [...groups.values()].map(async (group) => {
      const sorted = [...group.dates].sort();
      const range = await getDailyRange(group.place, sorted[0], sorted[sorted.length - 1]);
      for (const date of group.dates) {
        const day = range.get(date);
        // 예보 API가 못 주는 옛날 날짜는 그냥 비워 둔다 (다음에 다시 시도한다)
        if (!day) continue;
        rows.push(toRow(user.id, date, group.place, day));
        filled.set(date, { ...day, place: group.place });
      }
    }),
  );

  await upsert(rows);
  return filled;
}

/**
 * 그 날짜의 지역이 바뀌었으니 날씨를 다시 받아 덮어쓴다.
 * 오늘과 그 이후는 저장하지 않으므로 (예보라 계속 바뀐다) 지난 날짜만 손댄다.
 */
export async function refreshStoredDay(date: string, place: Place): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return;

  if (date >= seoulToday()) {
    // 예보 구간이면 저장해 둔 값이 있어도 의미가 없다. 지워서 다시 받게 한다.
    await supabase.from("daily_weather").delete().eq("user_id", user.id).eq("on_date", date);
    return;
  }

  const stored = (await readStoredWeather(date, date)).get(date);
  if (stored && placeKey(stored.place) === placeKey(place)) return;

  const range = await getDailyRange(place, date, date);
  const day = range.get(date);
  if (!day) return;
  await upsert([toRow(user.id, date, place, day)]);
}

/**
 * 달력 한 판의 날씨.
 * 지난 날짜는 저장해 둔 값을 쓰고 (없으면 한 번 받아서 저장),
 * 오늘부터는 예보라 매번 새로 받는다.
 */
export async function getCalendarWeather(
  base: Place,
  placeByDate: Map<string, Place>,
  dates: string[],
): Promise<Map<string, DayWeather>> {
  const merged = new Map<string, DayWeather>();
  if (dates.length === 0) return merged;

  const today = seoulToday();
  const sorted = [...dates].sort();
  const placeOf = (date: string) => placeByDate.get(date) ?? base;

  const stored = await readStoredWeather(sorted[0], sorted[sorted.length - 1]);
  const missing = sorted.filter((date) => date < today && !stored.has(date));
  const ahead = sorted.filter((date) => date >= today);

  const [filled, forecast] = await Promise.all([
    fillPastWeather(missing, placeOf),
    ahead.length > 0
      ? getDailyRangeByPlace(base, placeByDate, ahead)
      : Promise.resolve(new Map<string, DayWeather>()),
  ]);

  for (const date of sorted) {
    const day = date < today ? (stored.get(date) ?? filled.get(date)) : forecast.get(date);
    if (day) merged.set(date, day);
  }
  return merged;
}

/** 하루치. 규칙은 달력과 같다 (지난 날은 저장분, 오늘부터는 예보) */
export async function getDayWeather(date: string, place: Place): Promise<DayWeather | null> {
  if (date >= seoulToday()) {
    const range = await getDailyRange(place, date, date);
    return range.get(date) ?? null;
  }

  const stored = await readStoredWeather(date, date);
  const hit = stored.get(date);
  if (hit) return hit;

  const filled = await fillPastWeather([date], () => place);
  return filled.get(date) ?? null;
}

/**
 * 이 지역 기준으로 저장해 둔 날들을 지운다.
 * 기본 지역을 바꿨을 때 예전 기본 지역으로 채워진 날들을 비워, 다음에 볼 때
 * 새 기본 지역으로 다시 채워지게 하는 용도다. (날짜별로 따로 정해 둔 날은 건드리지 않는다)
 */
export async function dropStoredForPlace(place: Place): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return;

  await supabase
    .from("daily_weather")
    .delete()
    .eq("user_id", user.id)
    .eq("place_lat", place.lat)
    .eq("place_lon", place.lon);
}
