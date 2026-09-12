/**
 * 서버에서 그릴 때 쓰는 고정 난수.
 *
 * 홈 배경처럼 "아무거나 뽑아 배치"하는 화면은 Math.random 을 쓰면
 * 서버와 브라우저가 다른 그림을 그리고(하이드레이션 불일치),
 * 새로고침마다 배치가 튄다. 날짜를 시드로 주면 하루 동안은 같은 그림이고
 * 날이 바뀌면 다른 옷이 뜬다.
 */

/** FNV-1a. 문자열을 시드로 쓸 32비트 정수로 */
export function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 선형 합동 난수 */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function shuffled<T>(list: T[], next: () => number) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
