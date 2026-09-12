/**
 * 날씨 저장분을 다시 받을지 정하는 규칙 확인.
 *   node --experimental-strip-types bin/check-weather-freshness.ts
 *
 * 테스트 러너를 들이지 않으려고 한 파일로 뒀다. 규칙만 보는 것이라
 * 네트워크도 DB도 필요 없다.
 */
import { FORECAST_STALE_MS, needsFetch, type Freshness } from "../lib/weather-freshness.ts";

const past: Freshness =
  { stored: true, samePlace: true, age: 0, past: true, pinned: false, recorded: false };
const today: Freshness = { ...past, past: false };
const cases: [string, Freshness, boolean][] = [
  ["저장분이 없으면 받는다", { ...past, stored: false }, true],

  // 지난 날 — 지역도 값도 굳었다
  ["지난 날: 기본 지역을 바꿔도 적어 둔 값 그대로", { ...past, samePlace: false }, false],
  [
    "지난 날: 그날 지역을 직접 고쳐 적었으면 다시 받는다",
    { ...past, samePlace: false, pinned: true },
    true,
  ],
  ["지난 날: 지역이 같으면 아무리 오래돼도 안 받는다", { ...past, age: 1e12 }, false],
  [
    "지난 날: 적어 둔 지역과 같으면 지정한 날도 안 받는다",
    { ...past, pinned: true, age: 1e12 },
    false,
  ],

  // 기록을 남긴 날 — 아직 안 지났어도 지역은 굳는다
  [
    "오늘, 기록함: 기본 지역을 바꿔도 안 따라간다",
    { ...today, recorded: true, samePlace: false },
    false,
  ],
  [
    "오늘, 기록함: 그날 지역을 직접 고쳐 적었으면 다시 받는다",
    { ...today, recorded: true, samePlace: false, pinned: true },
    true,
  ],
  [
    "오늘, 기록함: 같은 지역이면 예보는 계속 갱신한다",
    { ...today, recorded: true, age: FORECAST_STALE_MS + 1 },
    true,
  ],

  // 기록이 없는 오늘·앞으로는 예보일 뿐이다
  ["오늘: 받아 둔 지 얼마 안 됐으면 그대로", { ...today, age: 60_000 }, false],
  ["오늘: 오래됐으면 다시 받는다", { ...today, age: FORECAST_STALE_MS + 1 }, true],
  ["앞으로: 기록이 없으면 지역을 바꾼 대로 따라간다", { ...today, samePlace: false }, true],
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
