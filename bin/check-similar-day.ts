/**
 * 비슷한 날 고르기 확인.
 *   node --experimental-strip-types bin/check-similar-day.ts
 */
import { pickSimilar, score, tempGap, TOO_FAR, type Candidate } from "../lib/similar-day.ts";

const day = (
  date: string,
  high: number,
  low: number,
  kind: string,
  felt: string | null = "ok",
): Candidate => ({ date, high, low, kind, felt, itemIds: ["a", "b"] });

const target = { high: 20, low: 12, kind: "clear" };

const checks: [string, boolean][] = [
  // 점수: 기온 차 + (날씨 종류가 다르면 벌점) + (그날 안 맞았으면 벌점).
  // 앞의 둘만 보려고 felt 는 "ok" 로 고정해 둔다 (벌점 0).
  ["똑같은 날은 0점", score(target, { high: 20, low: 12, kind: "clear" }, "ok") === 0],
  ["기온이 벌어질수록 커진다", score(target, { high: 23, low: 12, kind: "clear" }, "ok") === 3],
  ["최고·최저를 둘 다 본다", score(target, { high: 22, low: 10, kind: "clear" }, "ok") === 4],
  ["날씨 종류가 다르면 벌점", score(target, { high: 20, low: 12, kind: "rain" }, "ok") === 3],
  ["같은 종류로 묶인 코드는 벌점 없다", score(target, { high: 20, low: 12, kind: "clear" }, "ok") === 0],
  ["기온이 같으면 같은 날씨가 이긴다",
    score(target, { high: 20, low: 12, kind: "clear" }, "ok") < score(target, { high: 20, low: 12, kind: "cloud" }, "ok")],
  ["기온이 훨씬 가까우면 날씨가 달라도 이긴다",
    score(target, { high: 20, low: 12, kind: "rain" }, "ok") < score(target, { high: 25, low: 17, kind: "clear" }, "ok")],

  // 고르기
  ["제일 비슷한 날을 고른다",
    pickSimilar(target, [day("2026-01-01", 25, 17, "clear"), day("2026-02-02", 21, 13, "clear")])?.date ===
      "2026-02-02"],
  ["점수가 같으면 최근 날",
    pickSimilar(target, [day("2026-01-01", 21, 13, "clear"), day("2026-03-03", 19, 11, "clear")])?.date ===
      "2026-03-03"],
  ["옷을 안 적은 날은 건너뛴다",
    pickSimilar(target, [
      { ...day("2026-05-05", 20, 12, "clear"), itemIds: [] },
      day("2026-01-01", 22, 14, "clear"),
    ])?.date === "2026-01-01"],
  ["후보가 없으면 null", pickSimilar(target, []) === null],

  // 너무 다른 날은 아예 안 권한다
  ["기온이 너무 벌어지면 안 권한다", pickSimilar(target, [day("2026-01-01", 3, -5, "clear")]) === null],
  ["한 벌만 너무 멀어도 안 권한다", tempGap(target, { high: 20, low: -5, kind: "clear" }) > TOO_FAR],
  ["가까운 날 하나만 있으면 그걸 권한다",
    pickSimilar(target, [day("2026-01-01", 3, -5, "clear"), day("2026-02-02", 18, 11, "cloud")])?.date ===
      "2026-02-02"],
  ["아슬아슬하게 가까우면 권한다", pickSimilar(target, [day("2026-01-01", 26, 18, "clear")]) !== null],
  ["아슬아슬하게 멀면 안 권한다", pickSimilar(target, [day("2026-01-01", 27, 19, "clear")]) === null],

  // 종류가 같으냐만 본다 — 무엇이 같은 종류인지는 lib/weather-codes 가 정한다
  ["같은 종류면 기온 차만 남는다", score(target, { high: 22, low: 14, kind: "clear" }, "ok") === 4],

  // 그날 어땠는지도 본다
  ["딱 맞았던 날은 벌점이 없다", score(target, target, "ok") === 0],
  ["추웠던 날은 벌점이 붙는다", score(target, target, "cold") > score(target, target, "ok")],
  ["더웠던 날도 마찬가지", score(target, target, "hot") === score(target, target, "cold")],
  ["안 적은 날은 그 중간", 
    score(target, target, null) > score(target, target, "ok") &&
      score(target, target, null) < score(target, target, "cold")],
  ["기온이 같으면 맞았던 날을 고른다",
    pickSimilar(target, [
      day("2026-03-03", 20, 12, "clear", "cold"),
      day("2026-01-01", 20, 12, "clear", "ok"),
    ])?.date === "2026-01-01"],
  ["기온이 훨씬 가까우면 안 맞았던 날이라도 이긴다",
    pickSimilar(target, [
      day("2026-01-01", 20, 12, "clear", "hot"),
      day("2026-02-02", 25, 17, "clear", "ok"),
    ])?.date === "2026-01-01"],
  ["다른 종류면 벌점이 붙는다",
    score(target, { high: 22, low: 14, kind: "snow" }, "ok") >
      score(target, { high: 22, low: 14, kind: "clear" }, "ok")],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
}
console.log(failed === 0 ? `\n${checks.length}개 모두 통과` : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);
