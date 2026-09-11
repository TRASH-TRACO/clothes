export const CATEGORIES = ["hat", "outer", "top", "bottom", "shoes", "acc"] as const;

export type Category = (typeof CATEGORIES)[number];

export type MeasurementField = {
  key: string;
  label: string;
  unit: "cm" | "mm";
  placeholder?: string;
};

type CategoryMeta = {
  label: string;
  en: string;
  /** 코디 보드에서의 노출 순서 (위 → 아래) */
  order: number;
  measurements: MeasurementField[];
  /** 세분류. 고르지 않아도 되고, 값은 이 목록의 글자 그대로 저장한다 */
  kinds: readonly string[];
};

const cm = (key: string, label: string, placeholder?: string): MeasurementField => ({
  key,
  label,
  unit: "cm",
  placeholder,
});

export const CATEGORY_META: Record<Category, CategoryMeta> = {
  hat: {
    label: "모자",
    en: "Headwear",
    order: 0,
    measurements: [
      cm("head", "머리둘레", "58"),
      cm("brim", "챙 길이", "7"),
      cm("height", "높이", "12"),
    ],
    kinds: ["볼캡", "스냅백", "비니", "버킷햇", "페도라", "바이저", "베레모"],
  },
  outer: {
    label: "아우터",
    en: "Outerwear",
    order: 1,
    measurements: [
      cm("shoulder", "어깨", "48"),
      cm("chest", "가슴", "56"),
      cm("length", "총장", "70"),
      cm("sleeve", "소매", "62"),
    ],
    kinds: ["코트", "패딩", "자켓", "블레이저", "가디건", "바람막이", "후드집업", "무스탕", "조끼"],
  },
  top: {
    label: "상의",
    en: "Tops",
    order: 2,
    measurements: [
      cm("shoulder", "어깨", "45"),
      cm("chest", "가슴", "52"),
      cm("length", "총장", "68"),
      cm("sleeve", "소매", "22"),
    ],
    kinds: ["반팔 티셔츠", "긴팔 티셔츠", "민소매", "셔츠", "블라우스", "맨투맨", "후드티", "니트", "폴로", "카라티"],
  },
  bottom: {
    label: "하의",
    en: "Bottoms",
    order: 3,
    measurements: [
      cm("waist", "허리", "40"),
      cm("hip", "엉덩이", "54"),
      cm("thigh", "허벅지", "32"),
      cm("rise", "밑위", "28"),
      cm("length", "총장", "100"),
      cm("hem", "밑단", "18"),
    ],
    kinds: ["청바지", "슬랙스", "치노", "반바지", "조거", "트레이닝", "카고", "레깅스", "스커트"],
  },
  shoes: {
    label: "신발",
    en: "Shoes",
    order: 4,
    measurements: [
      { key: "size", label: "사이즈", unit: "mm", placeholder: "270" },
      cm("width", "발볼", "10"),
    ],
    kinds: ["운동화", "스니커즈", "러닝화", "구두", "로퍼", "부츠", "샌들", "슬리퍼", "쪼리"],
  },
  acc: {
    label: "액세서리",
    en: "Accessories",
    order: 5,
    measurements: [cm("length", "길이", "40"), cm("width", "너비", "3")],
    kinds: ["가방", "벨트", "시계", "목걸이", "반지", "팔찌", "안경", "선글라스", "스카프", "머플러", "장갑", "양말"],
  },
};

/** 코디 보드 슬롯 순서 */
export const SLOT_ORDER: Category[] = [...CATEGORIES].sort(
  (a, b) => CATEGORY_META[a].order - CATEGORY_META[b].order,
);

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

export function categoryLabel(category: Category) {
  return CATEGORY_META[category].label;
}

/** 그 카테고리에서 고를 수 있는 세분류 */
export function kindsOf(category: Category) {
  return CATEGORY_META[category].kinds;
}

/** 저장된 세분류가 그 카테고리의 목록에 있는 값인지 */
export function isKindOf(category: Category, value: unknown): value is string {
  return typeof value === "string" && CATEGORY_META[category].kinds.includes(value);
}

export function measurementFields(category: Category) {
  return CATEGORY_META[category].measurements;
}

/** measurements jsonb를 "어깨 45 · 가슴 52" 형태로 */
export function formatMeasurements(category: Category, values: Record<string, number> | null) {
  if (!values) return "";
  return measurementFields(category)
    .filter((field) => typeof values[field.key] === "number")
    .map((field) => `${field.label} ${values[field.key]}${field.unit}`)
    .join(" · ");
}
