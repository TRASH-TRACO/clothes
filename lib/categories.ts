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
  },
  shoes: {
    label: "신발",
    en: "Shoes",
    order: 4,
    measurements: [
      { key: "size", label: "사이즈", unit: "mm", placeholder: "270" },
      cm("width", "발볼", "10"),
    ],
  },
  acc: {
    label: "액세서리",
    en: "Accessories",
    order: 5,
    measurements: [cm("length", "길이", "40"), cm("width", "너비", "3")],
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
