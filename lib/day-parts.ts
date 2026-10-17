/**
 * 하루를 **밖에 있는 시간**으로 나눠 본다.
 *
 * 최고·최저로 옷을 고르면 틀린다. 최저는 보통 새벽 5~6시 값이라 겪지도 않는
 * 시간이고, 최고는 오후 2~3시다. 정작 집을 나서는 아침 기온은 그 둘 사이
 * 어딘가라 화면 어디에도 없었다 — 최고 20°에 맞춰 입고 14°에 서 있게 된다.
 *
 * 그래서 세 토막으로 본다. **나갈 때 · 가장 더울 때 · 돌아올 때.**
 *
 * 아무것도 안 문다 (bin/check-day-parts.ts 에서 바로 돌린다).
 */

/** 시간별 한 점. 체감이 있으면 체감을 쓴다 (아침 바람이 기온보다 정직하다) */
export type HourTemp = {
  /** 0~23 */
  hour: number;
  temp: number | null;
  /** 체감. 없으면 temp 를 쓴다 */
  feels?: number | null;
};

export type DayParts = {
  /** 나갈 때 — 07~09시 중 **가장 낮은** 값 */
  morning: number | null;
  /** 가장 더울 때 — 12~15시 중 가장 높은 값 */
  day: number | null;
  /** 돌아올 때 — 18~22시 중 가장 낮은 값 */
  night: number | null;
};

/** [시작, 끝] 둘 다 포함 */
export const MORNING: [number, number] = [7, 9];
export const DAY: [number, number] = [12, 15];
export const NIGHT: [number, number] = [18, 22];

function pick(
  hours: HourTemp[],
  [from, to]: [number, number],
  better: (a: number, b: number) => number,
): number | null {
  let found: number | null = null;
  for (const point of hours) {
    if (point.hour < from || point.hour > to) continue;
    // 체감이 있으면 체감이 먼저다. 0 도 쓸 수 있는 값이라 ?? 로 가른다.
    const value = point.feels ?? point.temp;
    if (value === null || value === undefined || !Number.isFinite(value)) continue;
    found = found === null ? value : better(found, value);
  }
  return found;
}

export function dayParts(hours: HourTemp[]): DayParts {
  return {
    morning: pick(hours, MORNING, Math.min),
    day: pick(hours, DAY, Math.max),
    night: pick(hours, NIGHT, Math.min),
  };
}

/**
 * 일교차 — **벗을 수 있어야 하는 폭**.
 *
 * 최고−최저가 아니라 낮−아침이다. 새벽 최저는 겪지 않으므로 그걸로 재면
 * 실제보다 크게 나오고, 겉옷을 과하게 챙기게 된다.
 */
export function swing(parts: DayParts): number | null {
  if (parts.morning === null || parts.day === null) return null;
  return parts.day - parts.morning;
}

export type Advice = {
  /** 0 = 안 띄움. 숫자가 클수록 더 챙겨야 한다 */
  level: 1 | 2 | 3;
  text: string;
};

/**
 * 몇 도 벌어지면 뭐라고 할지.
 *
 * **숫자만 적으면 그래서 뭘 입으란 건지 모른다.** 할 일을 같이 적는다.
 * 기준은 쓰면서 조정할 값이다 (기상청도 보통 10° 이상을 큰 일교차로 본다).
 */
export function advice(gap: number | null): Advice | null {
  if (gap === null || !Number.isFinite(gap)) return null;
  if (gap >= 15) return { level: 3, text: "아침과 낮이 다른 계절입니다" };
  if (gap >= 10) return { level: 2, text: "겉옷 꼭 — 아침에 추워요" };
  if (gap >= 5) return { level: 1, text: "얇은 겉옷 하나" };
  // 5도 아래는 하루 종일 비슷하다. 굳이 말할 게 없다.
  return null;
}
