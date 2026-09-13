/**
 * 목록에서 골라 쓸 때의 검색 규칙.
 *
 * 아무것도 안 물게 해 뒀다 (bin/check-search.ts 에서 바로 돌린다).
 */

/** 한글 첫소리 19개. 유니코드에 박혀 있는 순서 그대로다 */
const CHOSEONG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";

const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;
/** 첫소리 하나가 차지하는 글자 수 (중성 21 × 종성 28) */
const PER_CHOSEONG = 588;

/**
 * 견줄 수 있게 다듬는다.
 *
 * 띄어쓰기를 지우는 게 핵심이다. "오버핏 반팔" 을 "오버핏반팔" 로 보면
 * "오버 핏" 으로 쳐도 걸린다 — 어디서 띄었는지 기억하는 사람은 없다.
 */
function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, "");
}

/**
 * "오버핏 반팔" → "ㅇㅂㅍㅂㅍ"
 *
 * 한글이 아닌 글자는 그대로 둔다. "Supreme 반팔" 도 첫소리로 걸리게.
 */
export function initials(value: string): string {
  let out = "";
  for (const char of normalize(value)) {
    const code = char.charCodeAt(0);
    out +=
      code >= HANGUL_FIRST && code <= HANGUL_LAST
        ? CHOSEONG[Math.floor((code - HANGUL_FIRST) / PER_CHOSEONG)]
        : char;
  }
  return out;
}

/** 친 게 첫소리뿐인지 ("ㅇㅂㅍ"). 한 글자라도 아니면 아니다 */
export function isChoseongOnly(query: string): boolean {
  const trimmed = normalize(query);
  return trimmed.length > 0 && [...trimmed].every((char) => CHOSEONG.includes(char));
}

/**
 * 이 옷이 검색어에 걸리는지.
 *
 * 이름뿐 아니라 브랜드·세분류까지 같이 본다. "무탠다드" 로 찾는 사람도 있고
 * "반팔" 로 찾는 사람도 있다.
 *
 * **첫소리로도 찾는다.** "ㅇㅂㅍ" 로 "오버핏 반팔" 이 나온다. 폰에서 한글을
 * 다 치는 것보다 훨씬 빠르다. 다만 친 게 전부 첫소리일 때만 그렇게 본다 —
 * 아니면 "가" 같은 멀쩡한 글자까지 첫소리로 오해한다.
 */
export function matchesQuery(query: string, ...fields: (string | null | undefined)[]): boolean {
  const q = normalize(query);
  if (!q) return true;

  const joined = fields.filter(Boolean).join(" ");
  if (normalize(joined).includes(q)) return true;
  return isChoseongOnly(q) && initials(joined).includes(q);
}
