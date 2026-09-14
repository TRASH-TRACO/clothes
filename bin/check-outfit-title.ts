/**
 * 코디 이름 확인.
 *   node --experimental-strip-types bin/check-outfit-title.ts
 */
import { hasOwnTitle, outfitTitle } from "../lib/outfit-title.ts";

const two = ["오버핏 반팔", "슬랙스"];
const four = ["볼캡", "오버핏 반팔", "슬랙스", "스니커즈"];

const checks: [string, boolean][] = [
  ["지은 이름이 있으면 그대로", outfitTitle("출근룩", two) === "출근룩"],
  ["앞뒤 공백은 다듬는다", outfitTitle("  출근룩  ", two) === "출근룩"],
  ["공백뿐이면 안 지은 것", outfitTitle("   ", two) === "오버핏 반팔 + 슬랙스"],
  ["null 이면 옷으로 부른다", outfitTitle(null, two) === "오버핏 반팔 + 슬랙스"],
  ["undefined 도 마찬가지", outfitTitle(undefined, two) === "오버핏 반팔 + 슬랙스"],
  ["많으면 두 벌만 적고 나머지는 개수", outfitTitle(null, four) === "볼캡 + 오버핏 반팔 외 2"],
  ["한 벌이면 그 한 벌", outfitTitle(null, ["슬랙스"]) === "슬랙스"],
  ["빈 옷 이름은 안 센다", outfitTitle(null, ["", "  ", "슬랙스"]) === "슬랙스"],
  ["옷도 이름도 없으면 대신할 말", outfitTitle(null, []) === "이름 없는 코디"],

  ["지었는지 안다", hasOwnTitle("출근룩")],
  ["공백은 안 지은 것", !hasOwnTitle("   ")],
  ["null 은 안 지은 것", !hasOwnTitle(null)],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
}
console.log(failed === 0 ? `\n${checks.length}개 모두 통과` : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);
