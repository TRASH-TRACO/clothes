/**
 * 목록 검색 확인.
 *   node --experimental-strip-types bin/check-search.ts
 */
import { initials, isChoseongOnly, matchesQuery } from "../lib/search.ts";

const name = "오버핏 반팔";
const brand = "무탠다드";
const kind = "반팔 티셔츠";

const checks: [string, boolean][] = [
  ["첫소리를 뽑는다", initials("오버핏 반팔") === "ㅇㅂㅍㅂㅍ"],
  ["한글이 아닌 글자는 그대로", initials("Supreme 반팔") === "supremeㅂㅍ"],
  ["받침이 있어도 첫소리는 같다", initials("강") === "ㄱ" && initials("가") === "ㄱ"],

  ["첫소리만 친 건 안다", isChoseongOnly("ㅇㅂㅍ")],
  ["멀쩡한 글자는 첫소리가 아니다", !isChoseongOnly("오버핏")],
  ["섞이면 첫소리가 아니다", !isChoseongOnly("ㅇ버핏")],
  ["빈 값은 첫소리가 아니다", !isChoseongOnly("   ")],

  ["이름으로 찾는다", matchesQuery("오버", name, brand, kind)],
  ["브랜드로도 찾는다", matchesQuery("무탠", name, brand, kind)],
  ["세분류로도 찾는다", matchesQuery("티셔츠", name, brand, kind)],
  ["띄어쓰기를 몰라도 찾는다", matchesQuery("오버 핏", name, brand, kind)],
  ["붙여 쳐도 찾는다", matchesQuery("오버핏반팔", name, brand, kind)],
  ["대소문자를 안 가린다", matchesQuery("SUPREME", "Supreme 반팔")],
  ["첫소리로 찾는다", matchesQuery("ㅇㅂㅍ", name, brand, kind)],
  ["첫소리는 이어져야 한다", !matchesQuery("ㅍㅇㅂ", name, brand, kind)],
  ["없는 건 안 걸린다", !matchesQuery("코트", name, brand, kind)],
  ["빈 검색어면 다 걸린다", matchesQuery("", name, brand, kind)],
  ["빈 칸은 건너뛴다", matchesQuery("오버", name, null, undefined)],

  // "가" 는 ㄱ 으로 시작하지만, 친 글자가 멀쩡한 글자면 첫소리로 안 본다
  ["멀쩡한 글자를 첫소리로 오해하지 않는다", !matchesQuery("가", "강아지풀")],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
}
console.log(failed === 0 ? `\n${checks.length}개 모두 통과` : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);
