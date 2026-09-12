/**
 * AI 추천에 실어 보내는 내용 확인.
 *   node --experimental-strip-types bin/check-recommend-prompt.ts
 *
 * 실제로 모델을 부르지는 않는다 (돈이 나가고 네트워크도 필요하다).
 * 여기서 보는 건 "무엇을 보내는가" 뿐이다 — 옷 id 가 빠짐없이 들어가는지,
 * 날씨와 최근 기록이 붙는지, 추가 요청이 반영되는지.
 */
import {
  buildUserMessage,
  SYSTEM_PROMPT,
  type PromptHistory,
  type PromptItem,
} from "../lib/recommend-prompt.ts";

const items: PromptItem[] = [
  { id: "a1", name: "오버핏 반팔", category: "상의", subcategory: "반팔 티셔츠", color_name: "블랙", brand: "Supreme", notes: null },
  { id: "b2", name: "와이드 슬랙스", category: "하의", subcategory: "슬랙스", color_name: "차콜", brand: null, notes: "여름엔 더움" },
  { id: "c3", name: "호파라", category: "신발", subcategory: "샌들", color_name: "블랙", brand: "HOKA", notes: null },
];

const history: PromptHistory[] = [
  { date: "2026-09-11", itemIds: ["a1", "b2"], felt: "hot" },
];

const message = buildUserMessage(
  items,
  {
    target: "today",
    city: "서울",
    label: "흐림",
    high: 26,
    low: 17,
    feelsLike: 24,
    rainChance: 0,
    windMax: 3,
    compare: "어제와 비슷해요",
  },
  history,
  "많이 걸을 예정",
);

const checks: [string, boolean][] = [
  ["옷 id 가 전부 들어간다", items.every((item) => message.includes(item.id))],
  ["분류와 색이 붙는다", message.includes("상의/반팔 티셔츠") && message.includes("블랙")],
  ["메모가 붙는다", message.includes("여름엔 더움")],
  ["날씨가 붙는다", message.includes("최고 26°") && message.includes("체감 24°")],
  ["전날 비교 문구가 붙는다", message.includes("어제와 비슷해요")],
  ["최근 기록과 체감이 붙는다", message.includes("2026-09-11") && message.includes("더웠다")],
  ["추가 요청이 붙는다", message.includes("많이 걸을 예정")],
  ["지시는 시스템 쪽에만 있다", !message.includes("스타일리스트") && SYSTEM_PROMPT.includes("스타일리스트")],
  ["id 만 쓰라는 지시가 있다", SYSTEM_PROMPT.includes("id 만 쓴다")],
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
