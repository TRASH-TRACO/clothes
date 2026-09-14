/**
 * 같은 조합 판정 확인.
 *   node --experimental-strip-types bin/check-outfit-key.ts
 */
import { findSameOutfit, outfitKey, type KnownOutfit } from "../lib/outfit-key.ts";

const tee = outfitKey(["top1", "bottom1"]);
const known: KnownOutfit[] = [
  { id: "o1", name: "출근룩", key: outfitKey(["top1", "bottom1"]) },
  { id: "o2", name: "주말룩", key: outfitKey(["top1", "bottom1", "hat1"]) },
];

const checks: [string, boolean][] = [
  ["고른 옷이 같으면 같은 값", outfitKey(["a", "b"]) === outfitKey(["a", "b"])],
  ["고른 순서는 상관없다", outfitKey(["b", "a"]) === outfitKey(["a", "b"])],
  ["한 벌이라도 다르면 다른 값", outfitKey(["a", "b"]) !== outfitKey(["a", "c"])],
  ["한 벌 더 쓰면 다른 차림", outfitKey(["a", "b"]) !== outfitKey(["a", "b", "c"])],
  ["빈 자리는 없는 셈", outfitKey(["a", "", null, undefined, "b"]) === outfitKey(["a", "b"])],
  ["앞뒤 공백은 무시", outfitKey([" a ", "b"]) === outfitKey(["a", "b"])],
  ["같은 옷이 두 번 들어와도 한 번", outfitKey(["a", "a", "b"]) === outfitKey(["a", "b"])],
  ["아무것도 안 골랐으면 빈 값", outfitKey([]) === "" && outfitKey([null, " "]) === ""],

  ["이미 있는 조합을 찾는다", findSameOutfit(tee, known)?.name === "출근룩"],
  ["없는 조합은 안 찾는다", findSameOutfit(outfitKey(["top9"]), known) === null],
  ["모자 하나 더 쓴 건 다른 조합", findSameOutfit(outfitKey(["top1", "bottom1", "hat1"]), known)?.id === "o2"],
  ["고치는 중인 자기 자신은 뺀다", findSameOutfit(tee, known, "o1") === null],
  ["남의 코디와 같으면 걸린다", findSameOutfit(tee, known, "o2")?.id === "o1"],
  ["빈 조합은 아무것도 안 걸린다", findSameOutfit("", known) === null],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
}
console.log(failed === 0 ? `\n${checks.length}개 모두 통과` : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);
