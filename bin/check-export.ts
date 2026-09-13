/**
 * 내보내는 모양 확인.
 *   node --experimental-strip-types bin/check-export.ts
 */
import { toMarkdown, tidyExport, type ExportData } from "../lib/export-data.ts";

const data: ExportData = {
  내보낸시각: "2026-09-13T00:00:00.000Z",
  기본지역: "서울",
  옷: [
    {
      이름: "오버핏 반팔", 분류: "상의", 세분류: "반팔 티셔츠", 브랜드: "Supreme",
      색: "블랙", 표기사이즈: "L", 사이즈감: "오버핏",
      부위별: { 어깨: "크다" }, 실측: { 어깨: "52cm", 총장: "72cm" },
      메모: "여름에 자주", 보관함: false,
    },
    {
      이름: "줄어든 니트", 분류: "상의", 세분류: null, 브랜드: null,
      색: "그레이", 표기사이즈: null, 사이즈감: null,
      부위별: {}, 실측: {}, 메모: null, 보관함: true,
    },
  ],
  코디: [{ 이름: "출근룩", 옷: ["오버핏 반팔", "슬랙스"], 만족도: "맘에 들었다", 메모: null }],
  착용기록: [
    { 날짜: "2026-09-12", 옷: ["오버핏 반팔"], 코디: null, 체감: "적당했다",
      지역: null, 날씨: "최고 26° 최저 17° 흐림", 메모: null },
  ],
};

const md = toMarkdown(data);
const tidy = tidyExport(data);
const first = tidy.옷[0] as Record<string, unknown>;
const second = tidy.옷[1] as Record<string, unknown>;

const checks: [string, boolean][] = [
  ["머리말에 개수가 나온다", md.includes("옷 2개 · 코디 1개 · 착용 기록 1일")],
  ["옷 한 줄에 필요한 게 다 있다", md.includes("오버핏 반팔 · Supreme · 상의/반팔 티셔츠 · 블랙 · 표기 L · 입어보니 오버핏")],
  ["실측이 붙는다", md.includes("실측: 어깨 52cm, 총장 72cm")],
  ["부위별이 붙는다", md.includes("부위별: 어깨 크다")],
  ["보관함 표시가 붙는다", md.includes("줄어든 니트 · 상의 · 그레이 · 보관함")],
  ["빈 값은 줄을 안 만든다", !md.includes("실측: \n") && !md.includes("메모: null")],
  ["코디가 나온다", md.includes("출근룩: 오버핏 반팔 + 슬랙스 (만족도 맘에 들었다)")],
  ["착용 기록에 날씨·체감이 붙는다", md.includes("2026-09-12: 오버핏 반팔 · 최고 26° 최저 17° 흐림 · 체감 적당했다")],

  ["JSON 에서 빈 값은 빠진다", !("메모" in second) && !("실측" in second) && !("브랜드" in second)],
  ["JSON 에서 false 인 보관함은 빠진다", !("보관함" in first)],
  ["JSON 에서 true 인 보관함은 남는다", second.보관함 === true],
  ["JSON 에 값 있는 건 남는다", first.실측 !== undefined && first.이름 === "오버핏 반팔"],

  ["빈 옷장도 만들어진다", toMarkdown({ ...data, 옷: [], 코디: [], 착용기록: [] }).includes("(없음)")],
  ["키 같은 건 애초에 담기지 않는다", !md.toLowerCase().includes("sk-ant") && !JSON.stringify(tidy).toLowerCase().includes("key")],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${name}`);
}
console.log("\n--- 마크다운 ---");
console.log(md);
console.log(failed === 0 ? `\n${checks.length}개 모두 통과` : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);
