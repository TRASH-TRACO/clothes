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
  /** 그날 뭘 입었는지 기록을 남긴 날인지 */
  recorded: boolean;
};

/**
 * 지난 날씨는 예보가 아니라 **기록**이다. 기록을 남긴 날도 마찬가지다.
 *
 * 그래서 **지역은 굳는다**: 지나간 날이거나 그날 뭘 입었는지 적어 둔 날이면,
 * 나중에 설정에서 기본 지역을 바꿔도 그 날 날씨는 따라 바뀌지 않는다.
 * 이사를 하거나 여행 지역을 기본으로 바꿨다고 지난 기록이 딸려 바뀌면 안 된다.
 *
 * 지역이 바뀌는 경우는 하나뿐이다 — 그날 지역을 **직접 고쳐 적었을 때**
 * ("그날 나는 부산에 있었다").
 *
 * 값 자체는 다르다. 지난 날은 확정이라 그대로 두지만, 오늘과 앞으로는 예보라
 * 계속 바뀌므로 같은 지역이어도 오래되면 다시 받는다.
 */
export function needsFetch(f: Freshness): boolean {
  if (!f.stored) return true;

  // 지역이 달라졌다. 굳지 않은 날만 따라간다 (직접 고쳐 적었으면 굳었어도 따라간다).
  if (!f.samePlace) return f.pinned || !(f.past || f.recorded);

  // 지난 날은 확정값이다
  if (f.past) return false;

  // 오늘과 앞으로는 예보라 계속 바뀐다
  return f.age > FORECAST_STALE_MS;
}
