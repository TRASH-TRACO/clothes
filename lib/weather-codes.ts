/**
 * 날씨 코드를 읽기 좋게 바꾸는 부분.
 * 화면에서도 써야 해서 서버 전용인 weather.ts 와 따로 둔다.
 */

import type { Place } from "./places";

export type DayWeather = {
  code: number;
  high: number | null;
  low: number | null;
  /** mm */
  rainAmount: number | null;
  /**
   * 밖에 있는 시간으로 끊은 기온 (lib/day-parts.ts). 체감으로 잰다.
   *
   * 최저는 새벽 값이라 겪지 않는 시간이고 최고는 오후 2~3시다. 정작 나설 때
   * 기온이 그 사이에 숨어 있어서 따로 들고 다닌다.
   *
   * 예전에 적어 둔 날은 이 칸이 없다 (schema.sql 17 을 더하기 전에 받은 것).
   * 그때는 최고·최저로 돌아간다.
   */
  morning: number | null;
  day: number | null;
  night: number | null;
};

/**
 * 어느 지역 기준으로 적어 둔 값인지까지 들고 다니는 하루치.
 *
 * 기록을 남긴 날과 지나간 날은 지역이 굳으므로, 나중에 기본 지역을 바꾸면
 * 화면에 뜬 지역과 실제로 적어 둔 지역이 달라진다. 지금 기본 지역을 그대로
 * 보여주면 거짓말이 되므로 값과 함께 들고 다닌다.
 */
export type RecordedDay = DayWeather & { place: Place };

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
