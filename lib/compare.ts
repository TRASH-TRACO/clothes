/**
 * 옷 두 벌의 실측을 나란히 놓는 부분.
 *
 * "이 반팔이 저거보다 기장이 몇 cm 긴가" 를 보려는 것이므로,
 * 두 벌 중 **한쪽에라도 적혀 있는 항목**을 모두 보여준다. 한쪽만 적혀 있으면
 * 차이는 못 내지만 "저건 안 재어 놨다" 는 것 자체가 정보다.
 *
 * 아무것도 안 물게 해 뒀다 (bin/check-compare.ts 에서 바로 돌린다).
 */

export type CompareField = {
  key: string;
  label: string;
  unit: string;
};

export type CompareRow = {
  key: string;
  label: string;
  unit: string;
  a: number | null;
  b: number | null;
  /** b - a. 둘 다 있어야 낸다 */
  diff: number | null;
};

/** 소수점 찌꺼기를 없앤다 (0.1 단위 입력이라 2자리면 충분하다) */
function round(value: number) {
  return Math.round(value * 100) / 100;
}

/**
 * @param fieldsA 왼쪽 옷 분류의 실측 항목 (이름표는 이쪽을 먼저 쓴다)
 * @param fieldsB 오른쪽 옷 분류의 실측 항목
 */
export function compareRows(
  fieldsA: CompareField[],
  fieldsB: CompareField[],
  valuesA: Record<string, number> | null,
  valuesB: Record<string, number> | null,
): CompareRow[] {
  const fields = new Map<string, CompareField>();
  // A 를 먼저 넣어서, 같은 key 의 이름표가 분류마다 다를 때 A 쪽을 따른다
  for (const field of [...fieldsA, ...fieldsB]) {
    if (!fields.has(field.key)) fields.set(field.key, field);
  }

  const rows: CompareRow[] = [];
  for (const field of fields.values()) {
    const a = typeof valuesA?.[field.key] === "number" ? valuesA[field.key] : null;
    const b = typeof valuesB?.[field.key] === "number" ? valuesB[field.key] : null;
    // 둘 다 안 적어 둔 항목은 빈 줄만 늘린다
    if (a === null && b === null) continue;
    rows.push({
      key: field.key,
      label: field.label,
      unit: field.unit,
      a,
      b,
      diff: a !== null && b !== null ? round(b - a) : null,
    });
  }
  return rows;
}

/** "+2.5" / "-1" / "같음" */
export function diffLabel(diff: number | null): string | null {
  if (diff === null) return null;
  if (diff === 0) return "같음";
  return `${diff > 0 ? "+" : "−"}${Math.abs(diff)}`;
}
