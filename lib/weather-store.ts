import "server-only";

import { addDays, gridRange, seoulToday } from "./calendar";
import { isPlace, placeKey, roundPlace, type Place } from "./places";
import { isSupabaseConfigured } from "./supabase/env";
import { createClient, getUser } from "./supabase/server";
import { getDailyRange, type DayWeather } from "./weather";

/** 예보 API가 주는 구간. 이 밖은 받아올 방법이 없으니 부르지도 않는다 */
const MAX_PAST_DAYS = 92;
const MAX_FUTURE_DAYS = 15;

/** 아직 지나지 않은 날은 예보라 값이 바뀐다. 이보다 오래된 저장분은 다시 받는다 */
const FORECAST_STALE_MS = 3 * 60 * 60 * 1000;

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

/** 지정한 날짜들의 날씨를 받아서 저장한다 */
async function fetchAndStore(
  dates: string[],
  placeOf: (date: string) => Place,
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
      const range = await getDailyRange(group.place, sorted[0], sorted[sorted.length - 1]);
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

/** 저장분을 다시 받아야 하는지 */
function needsFetch(stored: StoredDay | undefined, want: Place, date: string) {
  if (!stored) return true;
  // 지역을 바꿨으면 옛 지역 값이 남아 있는 것이다
  if (placeKey(stored.place) !== placeKey(want)) return true;
  // 아직 지나지 않은 날은 예보라 값이 바뀐다. 지난 날은 확정이라 그대로 둔다.
  return date >= seoulToday() && Date.now() - stored.fetchedAt > FORECAST_STALE_MS;
}

/**
 * 달력 한 판의 날씨.
 *
 * - 지역을 따로 정해 둔 날: DB에 저장해 둔 값 (없거나 지역이 바뀌었으면 그때 받아 저장)
 * - 그 외의 날: 기본 지역으로 그때그때 받아온다 (한 번의 범위 조회로 끝난다)
 */
export async function getCalendarWeather(
  base: Place,
  placeByDate: Map<string, Place>,
  dates: string[],
): Promise<Map<string, DayWeather>> {
  const merged = new Map<string, DayWeather>();
  if (dates.length === 0) return merged;

  const sorted = [...dates].sort();
  const pinned = sorted.filter((date) => placeByDate.has(date));
  const plain = sorted.filter((date) => !placeByDate.has(date));

  const stored = pinned.length > 0 ? await readRows(pinned[0], pinned[pinned.length - 1]) : new Map();
  const stale = pinned.filter((date) => needsFetch(stored.get(date), placeByDate.get(date)!, date));

  const [filled, fromApi] = await Promise.all([
    fetchAndStore(stale, (date) => placeByDate.get(date)!),
    // 지정한 날을 빼고 부르면 범위가 들쭉날쭉해져 날짜 화면과 캐시가 갈린다.
    // 판 전체를 한 번 부르고 필요한 날짜만 꺼내 쓴다.
    plain.length > 0
      ? getDailyRange(base, sorted[0], sorted[sorted.length - 1])
      : Promise.resolve(new Map<string, DayWeather>()),
  ]);

  for (const date of sorted) {
    const day = placeByDate.has(date)
      ? (filled.get(date) ?? stored.get(date))
      : fromApi.get(date);
    if (day) merged.set(date, day);
  }
  return merged;
}

/** 하루치. 규칙은 달력과 같다 */
export async function getDayWeather(
  date: string,
  place: Place,
  pinned: boolean,
): Promise<DayWeather | null> {
  if (!pinned) {
    // 하루만 부르면 날짜마다 새로 받게 된다. 달력과 같은 범위로 불러
    // 이미 받아둔 응답을 그대로 쓴다.
    const { from, to } = gridRange(date);
    const range = await getDailyRange(place, from, to);
    return range.get(date) ?? null;
  }

  const stored = (await readRows(date, date)).get(date);
  if (!needsFetch(stored, place, date)) return stored ?? null;

  const filled = await fetchAndStore([date], () => place);
  return filled.get(date) ?? stored ?? null;
}

/** 그날 지역을 정했으니 그 지역 날씨를 받아 저장해 둔다 */
export async function storeDay(date: string, place: Place): Promise<void> {
  await fetchAndStore([date], () => place);
}

/** 그날 지역 지정을 지웠으니 저장분도 버린다 (다시 기본 지역으로 본다) */
export async function dropStoredDay(date: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await createClient();
  const user = await getUser();
  if (!user) return;
  await supabase.from("daily_weather").delete().eq("user_id", user.id).eq("on_date", date);
}
