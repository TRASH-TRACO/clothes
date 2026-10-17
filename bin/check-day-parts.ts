/**
 * 하루를 아침·낮·밤으로 나누는 규칙 확인.
 *   node --experimental-strip-types bin/check-day-parts.ts
 */
import {
  advice,
  dayParts,
  swing,
  type HourTemp,
} from "../lib/day-parts.ts";

/** 0~23시를 한 번에 만든다 */
function hours(by: (hour: number) => number | null, feels?: (hour: number) => number | null): HourTemp[] {
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    temp: by(hour),
    ...(feels ? { feels: feels(hour) } : {}),
  }));
}

/** 형님이 겪은 그 날 — 새벽 11°, 아침 14°, 낮 20°, 밤 18° */
const realDay: HourTemp[] = [
  { hour: 6, temp: 11 },
  { hour: 7, temp: 12 },
  { hour: 8, temp: 13 },
  { hour: 9, temp: 14 },
  { hour: 12, temp: 19 },
  { hour: 15, temp: 20 },
  { hour: 18, temp: 18 },
  { hour: 21, temp: 18 },
];
const real = dayParts(realDay);

/** 하루 종일 20도 */
const flat = dayParts(hours(() => 20));

/** 기온과 체감이 다른 날 — 아침에 바람이 분다 */
const windy = dayParts(
  hours(
    (h) => (h < 10 ? 14 : 20),
    (h) => (h < 10 ? 10 : 19),
  ),
);

const checks: [string, boolean][] = [
  // **형님이 겪은 것** — 최고 20° 를 보고 입었는데 9시는 14° 였다
  ["나갈 때는 07~09시 중 가장 낮은 값", real.morning === 12],
  ["새벽 최저(11°)에 안 끌려간다", real.morning !== 11],
  ["낮은 12~15시 중 가장 높은 값", real.day === 20],
  ["밤은 18~22시 중 가장 낮은 값", real.night === 18],
  ["일교차는 낮 − 아침", swing(real) === 8],
  [
    "최고−최저로 재면 9° 라 더 크게 나온다 (그래서 안 쓴다)",
    20 - 11 === 9 && swing(real)! < 9,
  ],

  // 체감이 있으면 체감이 먼저다
  ["체감이 있으면 체감을 쓴다", windy.morning === 10 && windy.day === 19],
  ["체감으로 재면 일교차가 더 크다", swing(windy) === 9],

  // 값이 모자랄 때
  ["그 시간대 값이 없으면 null", dayParts([{ hour: 3, temp: 5 }]).morning === null],
  ["아침이 없으면 일교차도 null", swing({ morning: null, day: 20, night: 15 }) === null],
  ["빈 목록도 안 터진다", dayParts([]).day === null],
  ["숫자가 아닌 값은 거른다", dayParts([{ hour: 8, temp: null }]).morning === null],
  ["0도도 값이다", dayParts([{ hour: 8, temp: 0 }]).morning === 0],

  // 일교차 → 할 말
  ["하루 종일 비슷하면 아무 말 안 한다", advice(swing(flat)) === null],
  ["4도는 안 띄운다", advice(4) === null],
  ["5도면 얇은 겉옷", advice(5)?.level === 1],
  ["9도도 얇은 겉옷", advice(9)?.level === 1],
  ["10도면 겉옷 꼭", advice(10)?.level === 2],
  ["15도면 다른 계절", advice(15)?.level === 3],
  ["형님의 그 날은 '얇은 겉옷 하나'", advice(swing(real))?.level === 1],
  ["말을 같이 준다", (advice(10)?.text.length ?? 0) > 0],
  ["모르면 아무 말 안 한다", advice(null) === null],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
}
console.log(failed === 0 ? `\n${checks.length}개 모두 통과` : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);
