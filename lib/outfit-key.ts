/**
 * 두 코디가 "같은 조합" 인지 가르는 규칙.
 *
 * 아무것도 안 물게 해 뒀다 (bin/check-outfit-key.ts 에서 바로 돌린다).
 *
 * **무엇을 같다고 볼 것인가**
 *
 *   같다고 본다 — 고른 옷이 똑같으면.
 *     고른 순서는 상관없다. 모자부터 골랐든 상의부터 골랐든 입으면 같은 차림이다.
 *
 *   다르다고 본다 — 한 벌이라도 다르면.
 *     모자 하나 더 쓴 건 다른 차림이다. "거의 같으니 같은 걸로 치자" 는 선을 그을
 *     수 없다 — 어디까지가 "거의" 인지는 사람마다 다르고 날마다 다르다.
 *
 *   안 본다 — 이름·메모·사진·만족도.
 *     그건 그 코디를 **어떻게 기록했는지**지 무엇을 입었는지가 아니다. 같은 차림에
 *     다른 이름을 붙일 수는 있어도, 그건 같은 차림이 둘이 되는 것뿐이다.
 *
 * 자리(slot)를 따로 안 보는 이유: 옷마다 분류가 하나로 정해져 있고 코디는 자리당
 * 한 벌이라, 고른 옷이 정해지면 자리도 저절로 정해진다.
 */

/**
 * 고른 옷들을 한 줄로 줄인 값. 같은 조합이면 같은 값이 나온다.
 *
 * 빈 값은 걸러내고, 같은 옷이 두 번 들어와도 한 번으로 친다
 * (한 벌을 두 자리에 넣을 수는 없으니 들어왔다면 실수다).
 */
export function outfitKey(itemIds: (string | null | undefined)[]): string {
  const ids = new Set<string>();
  for (const id of itemIds) {
    const trimmed = id?.trim();
    if (trimmed) ids.add(trimmed);
  }
  return [...ids].sort().join("|");
}

export type KnownOutfit = { id: string; name: string; key: string };

/**
 * 이 조합으로 이미 저장해 둔 코디.
 *
 * @param exceptId 고치고 있는 코디. 자기 자신과 같다고 막으면 아무것도 못 고친다.
 */
export function findSameOutfit(
  key: string,
  known: KnownOutfit[],
  exceptId?: string | null,
): KnownOutfit | null {
  if (!key) return null;
  return known.find((outfit) => outfit.key === key && outfit.id !== exceptId) ?? null;
}
