/**
 * 본문 스크롤 자물쇠 확인.
 *   node --experimental-strip-types bin/check-scroll-lock.ts
 *
 * 브라우저가 없으므로 body.style 만 흉내 낸다 (쓰는 건 그것뿐이다).
 */
const style = { overflow: "" };
(globalThis as { document?: unknown }).document = { body: { style } };

const { lockScroll, lockDepth } = await import("../lib/scroll-lock.ts");

const checks: [string, boolean][] = [];
function check(label: string, ok: boolean) {
  checks.push([label, ok]);
}

// 하나만 열렸다 닫힐 때
const a1 = lockScroll();
check("잠그면 hidden", style.overflow === "hidden");
a1();
check("풀면 원래대로", style.overflow === "");
check("아무도 안 잡고 있다", lockDepth() === 0);

// **형님이 겪은 것** — 겹쳐 열렸다가 엇갈려 닫히는 경우
const a = lockScroll();
const b = lockScroll();
check("둘이 겹쳐 열려도 hidden", style.overflow === "hidden");
a();
check("먼저 연 게 닫혀도 아직 잠겨 있다", style.overflow === "hidden");
b();
check("마지막이 닫히면 풀린다", style.overflow === "");

// 같은 자물쇠를 두 번 풀어도 깊이가 안 틀어진다
const c = lockScroll();
const d = lockScroll();
c();
c();
c();
check("같은 걸 여러 번 풀어도 한 번만 먹는다", style.overflow === "hidden");
d();
check("그래도 마지막엔 풀린다", style.overflow === "");
check("깊이가 음수로 안 내려간다", lockDepth() === 0);

// 원래 값이 비어 있지 않은 경우 (바깥에서 미리 정해 둔 값)
style.overflow = "clip";
const e = lockScroll();
check("잠그는 동안은 hidden", style.overflow === "hidden");
e();
check("원래 값이 있으면 그 값으로 돌아간다", style.overflow === "clip");

// 셋이 겹쳐도
style.overflow = "";
const locks = [lockScroll(), lockScroll(), lockScroll()];
locks[1]();
locks[0]();
check("셋 중 둘이 닫혀도 잠긴 채", style.overflow === "hidden");
locks[2]();
check("셋 다 닫히면 풀린다", style.overflow === "");

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
}
console.log(failed === 0 ? `\n${checks.length}개 모두 통과` : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);

export {};
