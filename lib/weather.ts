import "server-only";

import { headers } from "next/headers";

/** 예보 기준 시간대. 옷 고민은 한국 시간으로 한다. */
const TIME_ZONE = "Asia/Seoul";

/** 이 시각(KST)을 넘기면 오늘이 아니라 내일 예보를 본다 */
const TOMORROW_AFTER_HOUR = 17;

const SEOUL = { lat: 37.57, lon: 126.98, city: "서울" };

export type HourPoint = {
  /** 0~23 */
  hour: number;
  temp: number | null;
  rainChance: number | null;
  /** 오늘 예보에서 이미 지나간 시간 */
  past: boolean;
};

export type Weather = {
  /** "today"면 오늘, "tomorrow"면 내일 예보 */
  target: "today" | "tomorrow";
  city: string;
  code: number;
  high: number | null;
  low: number | null;
  /** 오늘 예보일 때만 있는 현재 기온 */
  now: number | null;
  /** 오늘이면 현재 체감, 내일이면 최저 체감 */
  feelsLike: number | null;
  rainChance: number | null;
  /** 하루 강수량 합 (mm) */
  rainAmount: number | null;
  windMax: number | null;
  hours: HourPoint[];
};

/** 지금 한국 시각 (날짜 문자열 + 시) */
function nowInSeoul() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    // hour12:false 는 자정을 24로 주는 구현이 있어 h23을 명시한다
    hourCycle: "h23",
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
  };
}

function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/**
 * 예보를 볼 위치.
 * 1) WEATHER_LAT/WEATHER_LON 을 넣었으면 그걸 쓰고
 * 2) Vercel이 붙여주는 IP 기반 좌표가 있으면 그걸 쓰고
 * 3) 둘 다 없으면 서울로 본다.
 */
async function resolveLocation() {
  const envLat = Number(process.env.WEATHER_LAT);
  const envLon = Number(process.env.WEATHER_LON);
  if (Number.isFinite(envLat) && Number.isFinite(envLon)) {
    return { lat: envLat, lon: envLon, city: process.env.WEATHER_CITY || "" };
  }

  const head = await headers();
  const lat = Number(head.get("x-vercel-ip-latitude"));
  const lon = Number(head.get("x-vercel-ip-longitude"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return SEOUL;

  // 도시명은 퍼센트 인코딩돼서 온다 (Seoul, %EC%84%9C%EC%9A%B8)
  let city = "";
  try {
    city = decodeURIComponent(head.get("x-vercel-ip-city") ?? "");
  } catch {
    city = head.get("x-vercel-ip-city") ?? "";
  }
  return { lat, lon, city };
}

/** 응답이 기대와 달라도 화면이 깨지지 않게 숫자만 걸러낸다 */
function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function pickIndex(times: unknown, date: string) {
  if (!Array.isArray(times)) return -1;
  return times.findIndex((t) => typeof t === "string" && t.startsWith(date));
}

/** 하루 중 이 시간대만 보여준다 (아침에 춥고 낮에 더운 걸 보려고) */
const CHECKPOINTS = [6, 9, 12, 15, 18, 21];

function buildHours(hourly: Record<string, unknown> | undefined, date: string, nowHour: number | null) {
  if (!hourly) return [];
  const times = hourly.time;
  if (!Array.isArray(times)) return [];

  const temps = Array.isArray(hourly.temperature_2m) ? hourly.temperature_2m : [];
  const chances = Array.isArray(hourly.precipitation_probability)
    ? hourly.precipitation_probability
    : [];

  return CHECKPOINTS.map((hour) => {
    const stamp = `${date}T${String(hour).padStart(2, "0")}:00`;
    const i = times.indexOf(stamp);
    return {
      hour,
      temp: i < 0 ? null : num(temps[i]),
      rainChance: i < 0 ? null : num(chances[i]),
      past: nowHour !== null && hour < nowHour,
    };
  }).filter((point) => point.temp !== null);
}

/**
 * 오전엔 오늘, 오후 5시부터는 내일 예보를 가져온다.
 * 날씨는 거들 뿐이라 실패하면 null을 주고 홈은 그대로 뜬다.
 */
export async function getWeather(): Promise<Weather | null> {
  const { lat, lon, city } = await resolveLocation();
  const seoul = nowInSeoul();
  const target = seoul.hour >= TOMORROW_AFTER_HOUR ? "tomorrow" : "today";
  const date = target === "today" ? seoul.date : addDays(seoul.date, 1);

  // 좌표를 적당히 잘라 같은 동네면 캐시를 같이 쓰게 한다
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${lat.toFixed(2)}&longitude=${lon.toFixed(2)}` +
    `&timezone=${encodeURIComponent(TIME_ZONE)}&forecast_days=2` +
    "&current=temperature_2m,apparent_temperature,weather_code" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_min," +
    "precipitation_sum,precipitation_probability_max,wind_speed_10m_max" +
    "&hourly=temperature_2m,precipitation_probability";

  let payload: Record<string, unknown>;
  try {
    const response = await fetch(url, {
      // 30분이면 옷 고르는 데 충분하다
      next: { revalidate: 1800 },
      // 날씨 API가 느리다고 홈이 같이 느려지면 안 된다
      signal: AbortSignal.timeout(4000),
    });
    if (!response.ok) return null;
    payload = await response.json();
  } catch {
    return null;
  }

  const daily = payload.daily as Record<string, unknown> | undefined;
  const index = pickIndex(daily?.time, date);
  if (!daily || index < 0) return null;

  const at = (key: string) => {
    const arr = daily[key];
    return Array.isArray(arr) ? num(arr[index]) : null;
  };

  const current = payload.current as Record<string, unknown> | undefined;
  const isToday = target === "today";
  const code = at("weather_code");

  return {
    target,
    city: city || SEOUL.city,
    code: code ?? 0,
    high: at("temperature_2m_max"),
    low: at("temperature_2m_min"),
    now: isToday ? num(current?.temperature_2m) : null,
    feelsLike: isToday ? num(current?.apparent_temperature) : at("apparent_temperature_min"),
    rainChance: at("precipitation_probability_max"),
    rainAmount: at("precipitation_sum"),
    windMax: at("wind_speed_10m_max"),
    hours: buildHours(
      payload.hourly as Record<string, unknown> | undefined,
      date,
      isToday ? seoul.hour : null,
    ),
  };
}

/** WMO 날씨 코드 → 한국어. 코드는 open-meteo 문서 기준 */
export function weatherLabel(code: number) {
  if (code === 0) return "맑음";
  if (code === 1) return "대체로 맑음";
  if (code === 2) return "구름 조금";
  if (code === 3) return "흐림";
  if (code === 45 || code === 48) return "안개";
  if (code >= 51 && code <= 57) return "이슬비";
  if (code >= 61 && code <= 65) return "비";
  if (code === 66 || code === 67) return "언 비";
  if (code >= 71 && code <= 77) return "눈";
  if (code >= 80 && code <= 82) return "소나기";
  if (code === 85 || code === 86) return "소낙눈";
  if (code >= 95) return "뇌우";
  return "―";
}

/** 아이콘을 고르기 위한 큰 분류 */
export function weatherKind(code: number) {
  if (code === 0 || code === 1) return "clear" as const;
  if (code === 2 || code === 3) return "cloud" as const;
  if (code === 45 || code === 48) return "fog" as const;
  if (code >= 71 && code <= 77) return "snow" as const;
  if (code === 85 || code === 86) return "snow" as const;
  if (code >= 95) return "thunder" as const;
  return "rain" as const;
}
