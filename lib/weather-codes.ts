/**
 * 날씨 코드를 읽기 좋게 바꾸는 부분.
 * 화면에서도 써야 해서 서버 전용인 weather.ts 와 따로 둔다.
 */

export type DayWeather = {
  code: number;
  high: number | null;
  low: number | null;
  /** mm */
  rainAmount: number | null;
};

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
