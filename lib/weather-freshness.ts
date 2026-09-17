/**
 * 저장해 둔 하루치 날씨를 다시 받아야 하는지, 받는다면 **어느 지역으로** 받을지.
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
  /**
   * 저장분을 **그날이 다 지난 뒤에** 받았는지.
   *
   * 지난 날이라고 다 확정값인 게 아니다. 7/19에 7/20 코디를 적어 두면 그때 받은
   * **하루 전 예보**가 저장되는데, 7/20에 앱을 한 번도 안 열면 그 예보가 그대로
   * 기록으로 굳는다. 그날이 끝난 뒤에 받은 값이라야 실제로 그랬던 날씨다.
   */
  settled: boolean;
  /** 그날 있던 지역을 사용자가 직접 적어 뒀는지 */
  pinned: boolean;
  /** 그날 뭘 입었는지 기록을 남긴 날인지 */
  recorded: boolean;
};

export type Plan = {
  /** 다시 받을지 */
  fetch: boolean;
  /**
   * 어느 지역으로 받을지.
   * `want` 는 지금 보려는 지역, `stored` 는 저장분을 받았던 지역이다.
   */
  place: "want" | "stored";
};

/**
 * 지난 날씨는 예보가 아니라 **기록**이다. 기록을 남긴 날도 마찬가지다.
 *
 * 그래서 **지역은 굳는다**: 지나간 날이거나 그날 뭘 입었는지 적어 둔 날이면,
 * 나중에 설정에서 기본 지역을 바꿔도 그 날 날씨는 따라 바뀌지 않는다.
 * 이사를 하거나 여행 지역을 기본으로 바꿨다고 지난 기록이 딸려 바뀌면 안 된다.
 * 지역이 바뀌는 경우는 하나뿐이다 — 그날 지역을 **직접 고쳐 적었을 때**
 * ("그날 나는 부산에 있었다").
 *
 * **굳는 건 지역이지 값이 아니다.** 예전에는 둘을 한 조건에 묶어 둬서, 미래 날짜에
 * 기록을 남긴 뒤 기본 지역을 바꾸면 그 날 예보가 아예 안 갱신됐다. 이제는 지역이
 * 굳은 날도 **그 굳은 지역으로** 계속 예보를 받는다 (place: "stored").
 */
export function fetchPlan(f: Freshness): Plan {
  if (!f.stored) return { fetch: true, place: "want" };

  // 직접 고쳐 적은 날은 사용자가 정한 지역을 따른다. 그 외에 지난 날과 기록을
  // 남긴 날은 받아 뒀던 지역으로 굳는다.
  const frozen = (f.past || f.recorded) && !f.pinned;
  const place = frozen ? "stored" : "want";

  // 쓸 지역이 저장분과 다르면 값도 그 지역 것으로 다시 받아야 한다
  if (place === "want" && !f.samePlace) return { fetch: true, place };

  // 지난 날은 확정값이다 — 단 **그날이 끝난 뒤에 받은 값이라야** 확정이다.
  // 그 전에 받은 건 아직 예보라 실측으로 한 번 덮는다. 덮고 나면 영영 안 받는다.
  if (f.past) return { fetch: !f.settled, place };

  // 오늘과 앞으로는 예보라 계속 바뀐다
  return { fetch: f.age > FORECAST_STALE_MS, place };
}
