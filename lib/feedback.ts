/** 그날 몸으로 느낀 온도 */
export const FELT_VALUES = ["cold", "ok", "hot"] as const;
export type Felt = (typeof FELT_VALUES)[number];

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

export function isFelt(value: unknown): value is Felt {
  return typeof value === "string" && FELT_VALUES.includes(value as Felt);
}

export function isRating(value: unknown): value is Rating {
  return typeof value === "string" && RATING_VALUES.includes(value as Rating);
}
