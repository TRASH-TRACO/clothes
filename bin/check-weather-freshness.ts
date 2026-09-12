/**
 * 날씨 저장분을 다시 받을지 정하는 규칙 확인.
 *   node --experimental-strip-types bin/check-weather-freshness.ts
 *
 * 테스트 러너를 들이지 않으려고 한 파일로 뒀다. 규칙만 보는 것이라
 * 네트워크도 DB도 필요 없다.
 */
import { FORECAST_STALE_MS, needsFetch, type Freshness } from "../lib/weather-freshness.ts";

const base: Freshness = { stored: true, samePlace: true, age: 0, past: true, pinned: false };
const cases: [string, Freshness, boolean][] = [
  ["저장분이 없으면 받는다", { ...base, stored: false }, true],

  // 이번에 고친 것
  [
    "지난 날: 기본 지역을 바꿔도 적어 둔 값 그대로",
    { ...base, samePlace: false, pinned: false },
    false,
  ],
  [
    "지난 날: 그날 지역을 직접 고쳐 적었으면 다시 받는다",
    { ...base, samePlace: false, pinned: true },
    true,
  ],
  ["지난 날: 지역이 같으면 아무리 오래돼도 안 받는다", { ...base, age: 1e12 }, false],
  [
    "지난 날: 적어 둔 지역과 같으면 지정한 날도 안 받는다",
    { ...base, pinned: true, age: 1e12 },
    false,
  ],

  // 오늘·앞으로는 예보
  ["오늘: 받아 둔 지 얼마 안 됐으면 그대로", { ...base, past: false, age: 60_000 }, false],
  ["오늘: 오래됐으면 다시 받는다", { ...base, past: false, age: FORECAST_STALE_MS + 1 }, true],
  ["앞으로: 지역이 바뀌면 바로 받는다", { ...base, past: false, samePlace: false }, true],
];

let failed = 0;
for (const [name, input, want] of cases) {
  const got = needsFetch(input);
  const ok = got === want;
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` — 기대 ${want}, 실제 ${got}`}`);
}
console.log(failed === 0 ? `\n${cases.length}개 모두 통과` : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);
