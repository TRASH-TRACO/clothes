/**
 * 코디를 뭐라고 부를지.
 *
 * 이름은 선택이다. 저장할 때마다 이름을 짓게 하면 짓기 싫어서 저장을 안 하게 된다.
 * 안 지었으면 **들어간 옷으로 부른다** — "오버핏 반팔 + 슬랙스" 면 무슨 코디인지
 * 이름보다 잘 알아본다.
 *
 * 아무것도 안 물게 해 뒀다 (bin/check-outfit-title.ts 에서 바로 돌린다).
 */

/** 이름 없이 부를 때 앞에 몇 벌까지 적을지. 그 뒤는 "외 N" */
const HEAD = 2;

/** 옷도 이름도 없을 때 */
const FALLBACK = "이름 없는 코디";

export function outfitTitle(name: string | null | undefined, itemNames: string[]): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;

  const names = itemNames.map((entry) => entry.trim()).filter(Boolean);
  if (names.length === 0) return FALLBACK;

  const head = names.slice(0, HEAD).join(" + ");
  const rest = names.length - HEAD;
  return rest > 0 ? `${head} 외 ${rest}` : head;
}

/** 이름을 직접 지었는지. 화면에서 흐리게 보일지 정할 때 쓴다 */
export function hasOwnTitle(name: string | null | undefined): boolean {
  return Boolean(name?.trim());
}
