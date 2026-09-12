/** 그날 몸으로 느낀 온도 */
export const FELT_VALUES = ["cold", "ok", "hot"] as const;
export type Felt = (typeof FELT_VALUES)[number];

/**
 * 입어보니 품이 어땠는지.
 *
 * 작다 → 레귤러 → 오버핏 → 크다 순으로 품이 넉넉해진다.
 * 가운데 둘은 입을 만한 것이고, 양끝은 안 맞는 것이다.
 */
export const FIT_VALUES = ["small", "regular", "over", "big"] as const;
export type Fit = (typeof FIT_VALUES)[number];

/** 코디가 마음에 들었는지 */
export const RATING_VALUES = ["bad", "ok", "good"] as const;
export type Rating = (typeof RATING_VALUES)[number];

export const FELT_LABELS: Record<Felt, string> = {
  cold: "추웠다",
  ok: "적당했다",
  hot: "더웠다",
};

export const RATING_LABELS: Record<Rating, string> = {
  bad: "별로였다",
  ok: "적당했다",
  good: "맘에 들었다",
};

/** 좁은 화면에서는 이모지 대신 색으로만 표시한다 */
export const FELT_COLORS: Record<Felt, string> = {
  cold: "#3b82f6",
  ok: "#a3a3a3",
  hot: "#fa5400",
};

export const FIT_LABELS: Record<Fit, string> = {
  small: "작다",
  regular: "레귤러",
  over: "오버핏",
  big: "크다",
};

/** 옷장 목록처럼 좁은 자리에 붙이는 짧은 표시 */
export const FIT_SHORT: Record<Fit, string> = {
  small: "작음",
  regular: "레귤러",
  over: "오버핏",
  big: "큼",
};

export function isFit(value: unknown): value is Fit {
  return typeof value === "string" && FIT_VALUES.includes(value as Fit);
}

export function isFelt(value: unknown): value is Felt {
  return typeof value === "string" && FELT_VALUES.includes(value as Felt);
}

export function isRating(value: unknown): value is Rating {
  return typeof value === "string" && RATING_VALUES.includes(value as Rating);
}
