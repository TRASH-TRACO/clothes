/**
 * 저장해 둔 하루치 날씨를 다시 받아야 하는지 정하는 규칙.
 *
 * 값을 읽어오는 일과 떼어 놓아서 규칙만 따로 확인할 수 있게 뒀다.
 * (bin/check-weather-freshness.ts)
 */

/** 아직 지나지 않은 날은 예보라 값이 바뀐다. 이보다 오래된 저장분은 다시 받는다 */
export const FORECAST_STALE_MS = 3 * 60 * 60 * 1000;

export type Freshness = {
  /** 저장해 둔 값이 있는지 */
  stored: boolean;
  /** 저장분을 받았던 지역이 지금 보려는 지역과 같은지 */
  samePlace: boolean;
  /** 저장분을 받아 둔 지 지난 시간(ms) */
  age: number;
  /** 이미 지나간 날인지 (오늘은 아직 안 지난 날로 본다) */
  past: boolean;
  /** 그날 있던 지역을 사용자가 직접 적어 뒀는지 */
  pinned: boolean;
};

/**
 * 지난 날씨는 예보가 아니라 **기록**이다.
 *
 * 그래서 나중에 설정에서 기본 지역을 바꿔도 이미 적어 둔 날의 날씨는 그대로 둔다.
 * 이사를 하거나 여행 지역을 기본으로 바꿨다고 작년 기록이 딸려 바뀌면 안 된다.
 *
 * 예외는 그날 지역을 직접 적어 둔 경우다. "그날 나는 부산에 있었다"고 고쳐
 * 적은 것이므로 그 지역으로 다시 받는다.
 *
 * 오늘과 앞으로는 예보라서 값이 계속 바뀐다. 지역이 달라졌거나 받아 둔 지
 * 오래됐으면 다시 받는다.
 */
export function needsFetch(f: Freshness): boolean {
  if (!f.stored) return true;
  if (f.past) return f.pinned && !f.samePlace;
  if (!f.samePlace) return true;
  return f.age > FORECAST_STALE_MS;
}
