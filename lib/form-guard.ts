/**
 * **"폼에 안 실렸다" 와 "비워서 냈다" 를 구별한다.**
 *
 * HTML 폼은 빈 칸을 안 보낸다. 그래서 서버에서 보면 둘이 똑같다.
 *
 *   - 사용자가 사진을 **다 지우고** 저장했다  → photo_paths 없음
 *   - 자르기 창이 떠서 그 칸이 **화면에 없었다** → photo_paths 없음
 *
 * 앞은 지워야 하고 뒤는 건드리면 안 되는데, 구별이 안 되니 전부 지워 버렸다.
 * 실제로 그렇게 사진이 통째로 날아간 적이 있다 (자르기 창을 열어 둔 채 저장).
 * 그때는 그 창이 칸을 안 지우게 고쳤지만, 그건 **그 버그 하나**를 고친 것이다.
 * 화면이 덜 그려지거나(하이드레이션 실패), 느린 폰에서 중간에 눌리거나, 나중에
 * 누가 그 칸을 조건부로 바꾸면 같은 일이 또 난다.
 *
 * 그래서 **칸을 그린 쪽이 "나 여기 있었다" 고 같이 보낸다.**
 *
 *   <input type="hidden" name="sent" value="photos" />
 *
 * 이 표가 없으면 서버는 그 칸을 **아예 안 건드린다** (지우지도, 쓰지도 않는다).
 * 지우고 싶으면 칸이 화면에 있어야 하고, 그러면 표도 같이 온다.
 *
 * 아무것도 안 문다 (bin/check-form-guard.ts 에서 바로 돌린다).
 */

/** 표를 싣는 칸 이름. 한 폼에 여러 개가 실린다 */
export const SENT_FIELD = "sent";

/** 지금 쓰는 묶음들. 값은 화면과 서버가 같은 글자를 써야 한다 */
export const SENT = {
  /** 사진 목록 (photo_path · photo_paths) */
  photos: "photos",
  /** 실측 (measurements) */
  measurements: "measurements",
  /** 부위별 사이즈감 (fit_notes) */
  fitNotes: "fit_notes",
  /** 그날 입은 옷 / 코디에 든 옷 */
  items: "items",
} as const;

/** 폼이 이 묶음을 실어 보냈는지 */
export function wasSent(marks: readonly string[], group: string): boolean {
  return marks.includes(group);
}

/**
 * 고칠 때 DB 로 넘길 값만 남긴다. **표가 안 온 묶음의 칸은 통째로 뺀다.**
 *
 * 뺀 칸은 update 문에 안 들어가므로 DB 에 있던 값이 그대로 남는다.
 * 어느 묶음에도 안 걸린 칸은 늘 그대로 간다 (이름·분류처럼 폼이 늘 싣는 것들).
 *
 * @param groups 묶음 이름 → 그 묶음이 책임지는 칸 이름들
 */
export function keepSent<T extends Record<string, unknown>>(
  values: T,
  marks: readonly string[],
  groups: Record<string, readonly string[]>,
): Partial<T> {
  const drop = new Set<string>();
  for (const [group, keys] of Object.entries(groups)) {
    if (!wasSent(marks, group)) for (const key of keys) drop.add(key);
  }

  const out: Partial<T> = {};
  for (const [key, value] of Object.entries(values)) {
    if (!drop.has(key)) out[key as keyof T] = value as T[keyof T];
  }
  return out;
}

/**
 * 이번 저장이 **있던 것을 지우는** 저장인지.
 *
 * 표까지 제대로 왔더라도, 한 번에 여러 묶음이 통째로 비어 오는 건 사람이 한
 * 일이라기보다 화면이 덜 그려진 쪽에 가깝다. 그럴 때 부르는 쪽이 한 번 더
 * 물어보게 하려고 따로 센다.
 */
export function clearsEverything(before: readonly unknown[], after: readonly unknown[]): boolean {
  const had = before.some((value) => filled(value));
  const has = after.some((value) => filled(value));
  return had && !has;
}

function filled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}
