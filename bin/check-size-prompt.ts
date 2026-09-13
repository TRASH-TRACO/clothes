/**
 * "살까 말까" 에 보내는 내용 확인.
 *   node --experimental-strip-types bin/check-size-prompt.ts
 *
 * 모델은 부르지 않는다. 무엇을 보내는지만 본다.
 */
import { buildSizeMessage, SIZE_SYSTEM_PROMPT, type SizeRefItem } from "../lib/size-prompt.ts";

const ref: SizeRefItem = {
  name: "오버핏 반팔",
  category: "상의",
  subcategory: "반팔 티셔츠",
  brand: "Supreme",
  sizeLabel: "L",
  fit: "오버핏",
  fields: [
    { label: "어깨", unit: "cm", value: 52, note: "크다" },
    { label: "가슴", unit: "cm", value: 58, note: null },
    { label: "총장", unit: "cm", value: 72, note: "길다" },
    { label: "소매 (겨드랑이)", unit: "cm", value: null, note: null },
  ],
};

const message = buildSizeMessage(ref, "상의", "M 살까 L 살까");

const checks: [string, boolean][] = [
  ["기준 옷 이름·브랜드가 들어간다", message.includes("오버핏 반팔") && message.includes("Supreme")],
  ["표기 사이즈가 들어간다", message.includes("표기 L")],
  ["전체 사이즈감이 들어간다", message.includes("입어보니 오버핏")],
  ["실측값이 들어간다", message.includes("어깨: 52cm") && message.includes("총장: 72cm")],
  ["부위별 느낌이 붙는다", message.includes("(입어보니 크다)") && message.includes("(입어보니 길다)")],
  ["안 잰 항목은 '안 잼' 으로", message.includes("소매 (겨드랑이): 안 잼")],
  ["메모가 들어간다", message.includes("M 살까 L 살까")],
  ["사려는 분류가 들어간다", message.includes("사려는 옷의 분류: 상의")],

  ["기준 옷이 없어도 만들어진다", buildSizeMessage(null, "신발", "").includes("기준 옷: 없음")],
  ["기준 옷이 없으면 실측 줄도 없다", !buildSizeMessage(null, "신발", "").includes("실측:")],

  ["지시는 시스템 쪽에만", !message.includes("지어내지 않는다")],
  ["사진에서 읽은 값만 쓰라는 지시", SIZE_SYSTEM_PROMPT.includes("사진에서 읽은 값만 쓴다")],
  ["단위 확인 지시", SIZE_SYSTEM_PROMPT.includes("inch")],
  ["적어 둔 느낌을 반영하라는 지시", SIZE_SYSTEM_PROMPT.includes("사용자가 적어 둔 느낌을 반드시 반영한다")],
  ["확신 없으면 말하라는 지시", SIZE_SYSTEM_PROMPT.includes("확신이 안 서면")],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${name}`);
}
console.log("\n--- 보내는 내용 ---");
console.log(message);
console.log(failed === 0 ? `\n${checks.length}개 모두 통과` : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);
