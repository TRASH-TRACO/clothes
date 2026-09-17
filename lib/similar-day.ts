/**
 * 오늘과 비슷했던 날 고르기.
 *
 * DB 가 기온 차로 여덟 줄쯤 추려 주면 (supabase/schema.sql 의 similar_days),
 * 그중에서 날씨 종류까지 보고 한 벌을 고른다.
 *
 * **날씨 종류는 밖에서 받는다.** 코드(0, 3, 61 …) → 종류 표는 lib/weather-codes 에
 * 이미 있고, 여기서 또 불러 쓰면 이 파일이 혼자 못 돌게 된다 (검사 스크립트가
 * 바로 돌려야 한다). 부르는 쪽에서 weatherKind() 를 한 번 거쳐 넘긴다.
 */

export type Target = {
  /** weatherKind() 가 준 값 ("clear" · "rain" …) */
  kind: string;
  high: number;
  low: number;
};

export type Candidate = Target & {
  /** YYYY-MM-DD */
  date: string;
  /** 그날 입은 옷 */
  itemIds: string[];
};

/**
 * 기온이 평균 이만큼 넘게 벌어지면 추천하지 않는다 (도).
 *
 * 3도인 날에 15도인 날의 옷을 권하면 안 하느니만 못하다.
 * 비슷한 날이 없으면 없다고 두는 게 맞다.
 */
export const TOO_FAR = 6;

/**
 * 날씨 종류가 다를 때 붙는 벌점 (도 단위로 친다).
 *
 * 같은 18도라도 맑은 날과 비 오는 날은 다르게 입는다. 3도쯤 차이 나는 것으로
 * 치면, 기온이 어지간히 비슷하지 않은 한 같은 종류의 날이 앞선다.
 */
const KIND_PENALTY = 3;

/** 작을수록 비슷하다 */
export function score(target: Target, candidate: Target): number {
  const gap = Math.abs(candidate.high - target.high) + Math.abs(candidate.low - target.low);
  return gap + (candidate.kind === target.kind ? 0 : KIND_PENALTY);
}

/** 기온만 본 거리 (평균 몇 도 차이). 너무 멀면 추천 자체를 접는다 */
export function tempGap(target: Target, candidate: Target): number {
  return (Math.abs(candidate.high - target.high) + Math.abs(candidate.low - target.low)) / 2;
}

/**
 * 가장 비슷한 하루. 없으면 null.
 *
 * 점수가 같으면 **최근 날**을 고른다. 같은 날씨라면 요즘 입던 게 더 맞다.
 */
export function pickSimilar(target: Target, candidates: Candidate[]): Candidate | null {
  let best: Candidate | null = null;
  let bestScore = Infinity;

  for (const candidate of candidates) {
    if (candidate.itemIds.length === 0) continue;
    if (tempGap(target, candidate) > TOO_FAR) continue;

    const value = score(target, candidate);
    if (value < bestScore || (value === bestScore && best !== null && candidate.date > best.date)) {
      best = candidate;
      bestScore = value;
    }
  }
  return best;
}
