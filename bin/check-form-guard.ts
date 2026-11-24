/**
 * "안 실린 칸은 안 건드린다" 규칙 확인.
 *   node --experimental-strip-types bin/check-form-guard.ts
 */
import { SENT, clearsEverything, keepSent, wasSent } from "../lib/form-guard.ts";

const GROUPS = {
  [SENT.photos]: ["photo_path", "photo_paths"],
  [SENT.measurements]: ["measurements"],
  [SENT.fitNotes]: ["fit_notes"],
};

const values = {
  name: "샴브레이 셔츠",
  category: "top",
  photo_path: "u1/a.jpg",
  photo_paths: ["u1/a.jpg", "u1/b.jpg"],
  measurements: { shoulder: 48 },
  fit_notes: { shoulder: "big" },
};

const keys = (marks: string[]) => Object.keys(keepSent(values, marks, GROUPS)).sort().join(",");

const checks: [string, boolean][] = [
  // 표 읽기
  ["실린 묶음은 참", wasSent(["photos", "measurements"], "photos")],
  ["안 실린 묶음은 거짓", !wasSent(["measurements"], "photos")],
  ["표가 없으면 거짓", !wasSent([], "photos")],
  ["비슷한 이름에 안 속는다", !wasSent(["photos_old"], "photos")],

  // 걸러내기
  ["표가 다 오면 그대로 간다",
    keys(["photos", "measurements", "fit_notes"]) ===
      "category,fit_notes,measurements,name,photo_path,photo_paths"],
  ["사진 표가 없으면 사진 칸 둘이 빠진다",
    keys(["measurements", "fit_notes"]) === "category,fit_notes,measurements,name"],
  ["실측 표가 없으면 실측만 빠진다",
    keys(["photos", "fit_notes"]) === "category,fit_notes,name,photo_path,photo_paths"],
  ["표가 하나도 없으면 묶인 칸이 다 빠진다", keys([]) === "category,name"],
  ["묶음에 안 걸린 칸은 늘 남는다", keys([]).includes("name") && keys([]).includes("category")],
  ["값은 안 바꾼다", (() => {
    const kept = keepSent(values, ["photos"], GROUPS);
    return kept.photo_paths === values.photo_paths && kept.name === "샴브레이 셔츠";
  })()],
  ["원래 값을 안 건드린다", (() => {
    keepSent(values, [], GROUPS);
    return values.photo_paths.length === 2 && values.photo_path === "u1/a.jpg";
  })()],
  ["빈 배열도 표가 있으면 실어 보낸다 — 사람이 지운 것이다", (() => {
    const kept = keepSent({ ...values, photo_paths: [], photo_path: null }, ["photos"], GROUPS);
    return "photo_paths" in kept && Array.isArray(kept.photo_paths) && kept.photo_paths.length === 0;
  })()],
  ["묶음이 없으면 전부 그대로", Object.keys(keepSent(values, [], {})).length === 6],

  // 통째로 비는 저장 알아보기
  ["있던 게 다 비면 참", clearsEverything([["a"], { x: 1 }], [[], {}])],
  ["원래 비어 있었으면 거짓", !clearsEverything([[], {}], [[], {}])],
  ["하나라도 남으면 거짓", !clearsEverything([["a"], { x: 1 }], [["a"], {}])],
  ["null 은 빈 것으로 본다", clearsEverything(["a"], [null])],
  ["공백만 있는 글자도 빈 것", clearsEverything(["a"], ["   "])],
  ["0 은 값이 있는 것으로 본다", clearsEverything([1], [0]) === false],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
}
console.log(failed === 0 ? `\n${checks.length}개 모두 통과` : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);
