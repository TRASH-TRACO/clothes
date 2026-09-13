/**
 * 실측 비교 확인.
 *   node --experimental-strip-types bin/check-compare.ts
 */
import {
  agoLabel,
  compareRows,
  compareSignature,
  diffLabel,
  type CompareField,
} from "../lib/compare.ts";

const top: CompareField[] = [
  { key: "shoulder", label: "어깨", unit: "cm" },
  { key: "chest", label: "가슴", unit: "cm" },
  { key: "length", label: "총장", unit: "cm" },
  { key: "sleeve", label: "소매 (어깨선)", unit: "cm" },
];
const acc: CompareField[] = [{ key: "length", label: "길이", unit: "cm" }];

/** 시각 표시를 재려고 고정해 두는 "지금" */
const T = Date.parse("2026-09-13T12:00:00Z");

const rows = compareRows(top, top, { shoulder: 45, length: 68, sleeve: 22 }, { shoulder: 47, length: 70.5 });
const row = (key: string) => rows.find((r) => r.key === key);

const checks: [string, boolean][] = [
  ["둘 다 안 적은 항목은 빠진다 (가슴)", row("chest") === undefined],
  ["한쪽만 적어도 줄은 남는다 (소매)", row("sleeve")?.b === null && row("sleeve")?.a === 22],
  ["한쪽만 있으면 차이는 없다", row("sleeve")?.diff === null],
  ["차이는 b - a", row("shoulder")?.diff === 2],
  ["소수점 찌꺼기가 안 남는다", row("length")?.diff === 2.5],
  ["줄 순서는 분류 항목 순서", rows.map((r) => r.key).join(",") === "shoulder,length,sleeve"],

  // 이름표가 분류마다 다른 key (length: 상의는 총장, 액세서리는 길이)
  ["이름표는 왼쪽 옷을 따른다", compareRows(top, acc, { length: 68 }, { length: 40 })[0].label === "총장"],
  ["왼쪽을 바꾸면 이름표도 바뀐다", compareRows(acc, top, { length: 40 }, { length: 68 })[0].label === "길이"],

  ["표시: 늘어난 쪽", diffLabel(2.5) === "+2.5"],
  ["표시: 줄어든 쪽", diffLabel(-1) === "−1"],
  ["표시: 같으면 같음", diffLabel(0) === "같음"],
  ["표시: 못 내면 없음", diffLabel(null) === null],

  // 기록을 한 줄로 줄이는 값. 같은 비교를 또 하면 줄이 늘면 안 된다.
  [
    "기록: 같은 두 벌이면 같은 값",
    compareSignature("A", { kind: "item", itemId: "B" }) ===
      compareSignature("A", { kind: "item", itemId: "B" }),
  ],
  [
    "기록: 좌우를 바꾸면 다른 값",
    compareSignature("A", { kind: "item", itemId: "B" }) !==
      compareSignature("B", { kind: "item", itemId: "A" }),
  ],
  [
    "기록: 새 옷은 실측을 고쳐도 같은 줄",
    compareSignature("A", { kind: "new", name: "무탠다드 반팔 L", category: "top", measurements: { length: 70 } }) ===
      compareSignature("A", { kind: "new", name: "무탠다드 반팔 L", category: "top", measurements: { length: 72 } }),
  ],
  [
    "기록: 이름의 대소문자·공백 차이는 같은 줄",
    compareSignature("A", { kind: "new", name: " Uniqlo  U  L ", category: "top", measurements: {} }) ===
      compareSignature("A", { kind: "new", name: "uniqlo u l", category: "top", measurements: {} }),
  ],
  [
    "기록: 이름이 다르면 다른 줄",
    compareSignature("A", { kind: "new", name: "반팔 L", category: "top", measurements: {} }) !==
      compareSignature("A", { kind: "new", name: "반팔 XL", category: "top", measurements: {} }),
  ],
  [
    "기록: 분류가 다르면 다른 줄",
    compareSignature("A", { kind: "new", name: "같은이름", category: "top", measurements: {} }) !==
      compareSignature("A", { kind: "new", name: "같은이름", category: "bottom", measurements: {} }),
  ],
  [
    "기록: 등록된 옷과 새 옷은 안 섞인다",
    compareSignature("A", { kind: "item", itemId: "B" }) !==
      compareSignature("A", { kind: "new", name: "B", category: "top", measurements: {} }),
  ],

  // 언제 견줬는지. 일주일치만 남으므로 "3일 전" 이면 충분하다.
  ["언제: 1분 안이면 방금", agoLabel(new Date(T - 30_000).toISOString(), T) === "방금"],
  ["언제: 분", agoLabel(new Date(T - 5 * 60_000).toISOString(), T) === "5분 전"],
  ["언제: 시간", agoLabel(new Date(T - 3 * 3_600_000).toISOString(), T) === "3시간 전"],
  ["언제: 날", agoLabel(new Date(T - 50 * 3_600_000).toISOString(), T) === "2일 전"],
  ["언제: 59분은 아직 분", agoLabel(new Date(T - 59 * 60_000).toISOString(), T) === "59분 전"],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${name}`);
}
console.log(failed === 0 ? `\n${checks.length}개 모두 통과` : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);
