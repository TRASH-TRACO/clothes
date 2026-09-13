/**
 * 알림 문구 확인.
 *   node --experimental-strip-types bin/check-push-message.ts
 */
import { tomorrowMessage } from "../lib/push-message.ts";

const full = tomorrowMessage(
  { placeName: "서울", high: 26.4, low: 17.5, label: "흐림" },
  "2026-09-14",
);
const partial = tomorrowMessage({ placeName: "부산", high: 21, low: null, label: null }, "2026-09-14");
const none = tomorrowMessage(null, "2026-09-14");
const empty = tomorrowMessage({ placeName: "서울", high: null, low: null, label: null }, "2026-09-14");

const checks: [string, boolean][] = [
  ["제목은 홈 문구와 같다", full.title === "내일은 뭐 입을까요?"],
  ["지역·기온·날씨가 한 줄에 든다", full.body === "서울 · 최고 26° 최저 18° 흐림"],
  ["기온은 반올림한다", full.body.includes("26°") && full.body.includes("18°")],
  ["없는 값은 자리를 안 차지한다", partial.body === "부산 · 최고 21°"],
  ["날씨를 못 받아도 할 말은 한다", none.body === "내일 입을 옷을 미리 생각해두세요."],
  ["값이 하나도 없으면 지역만 남기지 않는다", empty.body === "내일 입을 옷을 미리 생각해두세요."],
  ["누르면 홈으로 간다", full.url === "/"],
  ["tag 에 날짜가 들어간다", full.tag === "tomorrow-2026-09-14"],
  ["날짜가 다르면 tag 도 다르다", tomorrowMessage(null, "2026-09-15").tag !== none.tag],
];

let failed = 0;
for (const [name, ok] of checks) {
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${name}`);
}
console.log(failed === 0 ? `\n${checks.length}개 모두 통과` : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);
