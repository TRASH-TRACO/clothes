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

/**
 * 견줄 대상.
 *
 * 아직 안 산 옷은 옷장에 없다. 판매 페이지 실측표를 옮겨 적어 견주는 게
 * 이 기능을 쓰는 가장 큰 이유라서, 등록된 옷과 같은 자리에 놓을 수 있게 한다.
 */
export type CompareSide =
  | { kind: "item"; itemId: string }
  | { kind: "new"; name: string; category: string; measurements: Record<string, number> };

/** 이름을 안 지은 새 옷을 부르는 말 */
export const NEW_SIDE_NAME = "새로 살 옷";

/** 기록에서 이 옷을 뭐라고 부를지 */
export function sideName(side: CompareSide, itemName: (id: string) => string | null): string {
  if (side.kind === "item") return itemName(side.itemId) ?? "지워진 옷";
  return side.name.trim() || NEW_SIDE_NAME;
}

/** 대소문자·공백 차이로 같은 옷이 두 줄이 되지 않게 */
function normalize(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase().slice(0, 80);
}

/**
 * 비교 하나를 한 줄로 줄인 값.
 *
 * 같은 비교를 또 하면 줄을 늘리지 않고 이 값으로 덮어쓴다 (시각만 새로 쓴다).
 * 새 옷은 **실측을 빼고** 이름·분류로만 잡는다. 실측표를 보며 숫자를 고쳐 넣는
 * 동안 줄이 계속 늘어나면 안 되기 때문이다 — 같은 옷이면 한 줄이어야 한다.
 */
export function compareSignature(baseItemId: string, other: CompareSide): string {
  const right =
    other.kind === "item" ? `item:${other.itemId}` : `new:${other.category}:${normalize(other.name)}`;
  return `item:${baseItemId}|${right}`;
}

/**
 * 기록 목록에 붙일 "언제" 표시.
 *
 * 일주일치만 남기므로 날짜를 다 적을 필요가 없다. "3일 전" 이면 충분하다.
 * @param now 지금 (테스트에서 고정하려고 받는다)
 */
export function agoLabel(iso: string, now: number = Date.now()): string {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}
