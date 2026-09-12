import "server-only";

import { addDays, seoulToday } from "./calendar";
import { isPlace, placeKey, roundPlace, type Place } from "./places";
import { isSupabaseConfigured } from "./supabase/env";
import { createClient, getUser } from "./supabase/server";
import { needsFetch, type Freshness } from "./weather-freshness";
import { getDailyRange, type DayWeather } from "./weather";

/** 예보 API가 주는 구간. 이 밖은 받아올 방법이 없으니 부르지도 않는다 */
const MAX_PAST_DAYS = 92;
const MAX_FUTURE_DAYS = 15;

/** 저장해 둔 하루치 날씨. 어느 지역 기준으로 받았는지도 같이 남는다 */
export type StoredDay = DayWeather & { place: Place; fetchedAt: number };

type Row = {
  on_date: string;
  place_name: string;
  place_lat: number;
  place_lon: number;
  code: number | null;
  temp_high: number | null;
  temp_low: number | null;
  rain_amount: number | null;
  fetched_at: string;
};

const COLUMNS =
  "on_date, place_name, place_lat, place_lon, code, temp_high, temp_low, rain_amount, fetched_at";

function toStored(row: Row): StoredDay | null {
  const place = { name: row.place_name, lat: row.place_lat, lon: row.place_lon };
  if (!isPlace(place)) return null;
  return {
    place: roundPlace(place),
    code: row.code ?? 0,
    high: row.temp_high,
    low: row.temp_low,
    rainAmount: row.rain_amount,
    fetchedAt: Date.parse(row.fetched_at) || 0,
  };
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
    fetched_at: new Date().toISOString(),
  };
}

/** 받아올 수 있는 날짜인지 (너무 옛날이거나 너무 먼 미래면 부르지 않는다) */
function reachable(date: string) {
  const today = seoulToday();
  return date >= addDays(today, -MAX_PAST_DAYS) && date <= addDays(today, MAX_FUTURE_DAYS);
}

async function readRows(from: string, to: string): Promise<Map<string, StoredDay>> {
  const result = new Map<string, StoredDay>();
  if (!isSupabaseConfigured()) return result;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("daily_weather")
    .select(COLUMNS)
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

/**
 * 지정한 날짜들의 날씨를 받아서 저장한다.
 *
 * span 을 주면 API 는 그 범위로 부른다. 달력과 같은 범위로 불러야 같은 응답을
 * 다시 쓸 수 있어서다 (필요한 날짜만 꺼내 저장하는 건 그대로다).
 */
async function fetchAndStore(
  dates: string[],
  placeOf: (date: string) => Place,
  span?: { from: string; to: string },
): Promise<Map<string, StoredDay>> {
  const filled = new Map<string, StoredDay>();
  const targets = dates.filter(reachable);
  if (targets.length === 0 || !isSupabaseConfigured()) return filled;

  const user = await getUser();
  if (!user) return filled;

  // 지역이 같은 날끼리 묶어 한 번씩만 부른다
  const groups = new Map<string, { place: Place; dates: string[] }>();
  for (const date of targets) {
    const place = placeOf(date);
    const key = placeKey(place);
    const group = groups.get(key);
    if (group) group.dates.push(date);
    else groups.set(key, { place, dates: [date] });
  }

  const rows: ReturnType<typeof toRow>[] = [];
  await Promise.all(
    [...groups.values()].map(async (group) => {
      const sorted = [...group.dates].sort();
      const from = span?.from ?? sorted[0];
      const to = span?.to ?? sorted[sorted.length - 1];
      const range = await getDailyRange(group.place, from, to);
      for (const date of group.dates) {
        const day = range.get(date);
        if (!day) continue;
        rows.push(toRow(user.id, date, group.place, day));
        filled.set(date, { ...day, place: group.place, fetchedAt: Date.now() });
      }
    }),
  );

  if (rows.length > 0) {
    const supabase = await createClient();
    await supabase.from("daily_weather").upsert(rows, { onConflict: "user_id,on_date" });
  }
  return filled;
}

/** 저장분과 지금 보려는 지역을 규칙(lib/weather-freshness)이 읽을 수 있는 모양으로 */
function freshness(
  stored: StoredDay | undefined,
  want: Place,
  date: string,
  pinned: boolean,
): Freshness {
  return {
    stored: Boolean(stored),
    samePlace: Boolean(stored) && placeKey(stored!.place) === placeKey(want),
    age: stored ? Date.now() - stored.fetchedAt : 0,
    past: date < seoulToday(),
    pinned,
  };
}

/**
 * 달력 한 판의 날씨.
 *
 * 한 번 받은 날은 지역과 함께 DB에 남긴다. 그래서 다시 열어도 같은 값이 뜨고,
 * 나중에 기본 지역을 바꿔도 지난 날 기록은 그대로다.
 *
 * 다시 받는 건 아직 안 지난 날(예보라 값이 바뀐다)과,
 * 그날 지역을 새로 적어 둔 날뿐이다.
 */
export async function getCalendarWeather(
  base: Place,
  placeByDate: Map<string, Place>,
  dates: string[],
): Promise<Map<string, DayWeather>> {
  const merged = new Map<string, DayWeather>();
  if (dates.length === 0) return merged;

  const sorted = [...dates].sort();
  const span = { from: sorted[0], to: sorted[sorted.length - 1] };
  const stored = await readRows(span.from, span.to);

  // 여행 간 날은 그 지역, 나머지는 기본 지역
  const placeOf = (date: string) => placeByDate.get(date) ?? base;
  const stale = sorted.filter((date) =>
    needsFetch(freshness(stored.get(date), placeOf(date), date, placeByDate.has(date))),
  );

  // 달력 전체 범위로 부른다. 다시 열 때도 같은 주소라 응답을 그대로 쓴다.
  const filled = await fetchAndStore(stale, placeOf, span);

  for (const date of sorted) {
    const day = filled.get(date) ?? stored.get(date);
    if (day) merged.set(date, day);
  }
  return merged;
}

/** 그날 지역을 정했으니 그 지역 날씨를 받아 저장해 둔다 */
export async function storeDay(date: string, place: Place): Promise<void> {
  await fetchAndStore([date], () => place);
}

async function dropStoredDay(date: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return;
  await supabase.from("daily_weather").delete().eq("user_id", user.id).eq("on_date", date);
}

/**
 * 그날 지역 지정을 지웠으니 기본 지역 값으로 되돌린다.
 *
 * 지난 날이어도 다시 받는다. "그날 거기 없었다"고 사용자가 직접 고친 것이므로
 * 기록을 고쳐 주는 게 맞다. 반대로 설정에서 기본 지역만 바꾼 경우에는
 * 여기까지 오지 않는다 (needsFetch 가 지난 날을 그대로 둔다).
 */
export async function resetStoredDay(date: string, base: Place): Promise<void> {
  await dropStoredDay(date);
  await fetchAndStore([date], () => base);
}
