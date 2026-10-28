/**
 * 본문 스크롤 잠그기.
 *
 * 화면을 덮는 것들(날짜 패널·확인 창·고르기 창)이 뒤의 본문까지 같이 스크롤되면
 * 무엇을 보고 있었는지 자리를 잃는다. 그래서 열려 있는 동안 `body` 를 잠근다.
 *
 * **각자 잠그면 안 된다.** 예전에는 셋이 저마다 이렇게 했다.
 *
 *   const previous = document.body.style.overflow;   // 열 때
 *   document.body.style.overflow = "hidden";
 *   document.body.style.overflow = previous;         // 닫을 때
 *
 * 둘이 겹쳐 열리면 깊이가 틀어진다. A 가 열리고(previous="") B 가 그 위에
 * 열리면(previous="hidden"), A 가 먼저 닫히며 ""로 풀어 버리고, 나중에 B 가
 * 닫히면서 **"hidden" 을 다시 깔아 놓는다.** 아무것도 안 열려 있는데 본문이
 * 영영 안 움직인다 — 새로고침 말고는 못 푼다.
 *
 * 그래서 자물쇠를 하나만 두고 **몇 개가 잡고 있는지만 센다.** 마지막 하나가
 * 놓을 때 처음 값으로 돌려놓는다.
 *
 * 아무것도 안 문다 (bin/check-scroll-lock.ts 에서 바로 돌린다).
 */

/** 지금 몇 개가 잡고 있는지 */
let held = 0;

/** 처음 잠글 때의 값. 마지막이 놓을 때 이걸로 돌린다 */
let saved = "";

/**
 * 잠그고, **푸는 함수**를 돌려준다.
 *
 * 돌려준 함수는 여러 번 불러도 한 번만 먹는다 — 리액트가 정리 함수를 두 번
 * 부르는 경우가 있는데(개발 모드의 이중 실행), 그때마다 깊이가 내려가면
 * 아직 열려 있는 창의 잠금까지 풀린다.
 */
export function lockScroll(): () => void {
  const body = document.body;
  if (held === 0) {
    saved = body.style.overflow;
    body.style.overflow = "hidden";
  }
  held += 1;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    held -= 1;
    if (held <= 0) {
      held = 0;
      body.style.overflow = saved;
    }
  };
}

/** 검사용. 화면에서는 쓸 일이 없다 */
export function lockDepth() {
  return held;
}
