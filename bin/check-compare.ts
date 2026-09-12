/**
 * 실측 비교 확인.
 *   node --experimental-strip-types bin/check-compare.ts
 */
import { compareRows, diffLabel, type CompareField } from "../lib/compare.ts";

const top: CompareField[] = [
  { key: "shoulder", label: "어깨", unit: "cm" },
  { key: "chest", label: "가슴", unit: "cm" },
  { key: "length", label: "총장", unit: "cm" },
  { key: "sleeve", label: "소매 (어깨선)", unit: "cm" },
];
const acc: CompareField[] = [{ key: "length", label: "길이", unit: "cm" }];

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
];

let failed = 0;
for (const [name, ok] of checks) {
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${name}`);
}
console.log(failed === 0 ? `\n${checks.length}개 모두 통과` : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);
