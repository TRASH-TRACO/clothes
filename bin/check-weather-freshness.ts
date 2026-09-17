/**
 * 날씨 저장분을 다시 받을지, 받는다면 어느 지역으로 받을지 정하는 규칙 확인.
 *   node --experimental-strip-types bin/check-weather-freshness.ts
 *
 * 테스트 러너를 들이지 않으려고 한 파일로 뒀다. 규칙만 보는 것이라
 * 네트워크도 DB도 필요 없다.
 */
import { FORECAST_STALE_MS, fetchPlan, type Freshness, type Plan } from "../lib/weather-freshness.ts";

/** 지난 날. 그날이 끝난 뒤에 받은 값이라 확정이다 */
const past: Freshness = {
  stored: true,
  samePlace: true,
  age: 0,
  past: true,
  settled: true,
  pinned: false,
  recorded: false,
};
/** 오늘·앞날. 아직 안 끝난 날이라 확정일 수가 없다 */
const today: Freshness = { ...past, past: false, settled: false };

const cases: [string, Freshness, Plan][] = [
  ["저장분이 없으면 받는다", { ...past, stored: false }, { fetch: true, place: "want" }],

  // 지난 날 — 지역도 값도 굳었다
  [
    "지난 날: 기본 지역을 바꿔도 적어 둔 값 그대로",
    { ...past, samePlace: false },
    { fetch: false, place: "stored" },
  ],
  [
    "지난 날: 그날 지역을 직접 고쳐 적었으면 다시 받는다",
    { ...past, samePlace: false, pinned: true },
    { fetch: true, place: "want" },
  ],
  [
    "지난 날: 지역이 같으면 아무리 오래돼도 안 받는다",
    { ...past, age: 1e12 },
    { fetch: false, place: "stored" },
  ],
  [
    "지난 날: 적어 둔 지역과 같으면 지정한 날도 안 받는다",
    { ...past, pinned: true, age: 1e12 },
    { fetch: false, place: "want" },
  ],

  // **형님이 물은 것 ①** — 7/19에 7/20 코디를 적어 두고 7/20에 앱을 안 열면,
  // 저장된 건 하루 전 예보다. 그게 그대로 기록으로 굳으면 안 된다.
  [
    "지난 날인데 그날 끝나기 전에 받은 값이면 실측으로 한 번 덮는다",
    { ...past, settled: false },
    { fetch: true, place: "stored" },
  ],
  [
    "한 번 덮고 나면 영영 안 받는다",
    { ...past, settled: true, age: 1e12 },
    { fetch: false, place: "stored" },
  ],
  [
    "덮을 때도 굳은 지역으로 받는다 (기본 지역을 그새 바꿨어도)",
    { ...past, settled: false, samePlace: false },
    { fetch: true, place: "stored" },
  ],

  // 기록을 남긴 날 — 아직 안 지났어도 지역은 굳는다
  [
    "오늘, 기록함: 기본 지역을 바꿔도 안 따라간다",
    { ...today, recorded: true, samePlace: false, age: 0 },
    { fetch: false, place: "stored" },
  ],
  // **형님이 물은 것 ②** — 굳는 건 지역이지 값이 아니다
  [
    "오늘, 기록함: 지역을 바꿨어도 예보는 굳은 지역으로 계속 받는다",
    { ...today, recorded: true, samePlace: false, age: FORECAST_STALE_MS + 1 },
    { fetch: true, place: "stored" },
  ],
  [
    "오늘, 기록함: 그날 지역을 직접 고쳐 적었으면 다시 받는다",
    { ...today, recorded: true, samePlace: false, pinned: true },
    { fetch: true, place: "want" },
  ],
  [
    "오늘, 기록함: 같은 지역이면 예보는 계속 갱신한다",
    { ...today, recorded: true, age: FORECAST_STALE_MS + 1 },
    { fetch: true, place: "stored" },
  ],

  // 기록이 없는 오늘·앞으로는 예보일 뿐이다
  ["오늘: 받아 둔 지 얼마 안 됐으면 그대로", { ...today, age: 60_000 }, { fetch: false, place: "want" }],
  [
    "오늘: 오래됐으면 다시 받는다",
    { ...today, age: FORECAST_STALE_MS + 1 },
    { fetch: true, place: "want" },
  ],
  [
    "앞으로: 기록이 없으면 지역을 바꾼 대로 따라간다",
    { ...today, samePlace: false },
    { fetch: true, place: "want" },
  ],
];

let failed = 0;
for (const [name, input, want] of cases) {
  const got = fetchPlan(input);
  const ok = got.fetch === want.fetch && got.place === want.place;
  if (!ok) failed += 1;
  const show = (p: Plan) => `${p.fetch ? "받는다" : "그대로"}/${p.place}`;
  console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : ` — 기대 ${show(want)}, 실제 ${show(got)}`}`);
}
console.log(failed === 0 ? `\n${cases.length}개 모두 통과` : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);
