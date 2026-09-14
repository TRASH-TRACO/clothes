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

/**
 * 부위별로 어땠는지. 기장은 길다/짧다, 품은 크다/작다, 양쪽 다 "적당하다" 가 있다.
 *
 * 전체 사이즈감(Fit)이 "크다" 라고만 하면 어깨가 큰 건지 기장이 긴 건지 모른다.
 * 새 옷 살 때 필요한 건 그 "어디가" 쪽이다.
 *
 * **"적당하다" 와 "안 적었다" 는 다르다.** 안 적은 건 모르는 것이고, 적당하다고
 * 적은 건 입어보고 괜찮았다는 기록이다. 새 옷을 견줄 때 "그 옷 어깨가 딱 맞았으니
 * 이건 크겠다" 는 말은 앞의 것으로는 못 한다.
 */
export const PART_FIT_VALUES = ["long", "short", "big", "small", "good"] as const;
export type PartFit = (typeof PART_FIT_VALUES)[number];

export const PART_FIT_LABELS: Record<PartFit, string> = {
  long: "길다",
  short: "짧다",
  big: "크다",
  small: "작다",
  good: "적당하다",
};

/** 옷장 목록처럼 좁은 자리에 붙이는 짧은 표시 */
export const PART_FIT_SHORT: Record<PartFit, string> = {
  long: "길다",
  short: "짧다",
  big: "크다",
  small: "작다",
  good: "적당",
};

/**
 * 기장 계열에서 고를 수 있는 값 / 품 계열에서 고를 수 있는 값.
 * 가운데가 "적당" 이라 세 칸이 그대로 눈금이 된다 (길다 – 적당 – 짧다).
 */
export const PART_FIT_BY_AXIS = {
  length: ["long", "good", "short"],
  girth: ["big", "good", "small"],
} as const satisfies Record<string, readonly PartFit[]>;

export function isPartFit(value: unknown): value is PartFit {
  return typeof value === "string" && PART_FIT_VALUES.includes(value as PartFit);
}

/** DB 에서 온 jsonb 를 믿지 않고 걸러 낸다 */
export function readPartFits(value: unknown): Record<string, PartFit> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, PartFit> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (isPartFit(entry)) out[key] = entry;
  }
  return out;
}
