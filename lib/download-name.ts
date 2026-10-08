/**
 * 사진을 내려받을 때 붙일 이름과 헤더.
 *
 * 저장해 둔 경로에는 uuid 가 박혀 있어서 그대로 받으면 사진첩에 `a3f2….jpg` 가 쌓인다.
 * 그래서 옷·코디 이름을 주소로 받아 그 이름으로 저장되게 한다.
 *
 * **주소로 들어온 값이라 그대로 헤더에 넣으면 안 된다.** 줄바꿈이 섞이면 헤더를
 * 쪼갤 수 있고, 따옴표가 섞이면 이름이 거기서 끊긴다.
 *
 * 아무것도 안 문다 (bin/check-download-name.ts 에서 바로 돌린다).
 */

/** 이름 최대 길이. 파일 이름이 한 줄을 넘어갈 이유가 없다 */
export const NAME_MAX = 60;

/** 파일 이름에 못 쓰거나 헤더를 깨뜨릴 수 있는 글자 */
const UNSAFE = /[\\/:*?"<>|\u0000-\u001f\u007f]/g;

/** 걸러낸 이름. 남는 게 없으면 "photo" */
export function safeName(raw: string | null | undefined, extension: string): string {
  const cleaned = (raw ?? "")
    .replace(UNSAFE, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NAME_MAX)
    .trim();
  return `${cleaned || "photo"}${extension}`;
}

/**
 * Content-Disposition 한 줄.
 *
 * 한글 이름은 `filename*` (RFC 5987) 로만 보낼 수 있다. 퍼센트 인코딩을 거치고 나면
 * 헤더를 깨뜨릴 글자가 남지 않는다. `filename*` 를 못 읽는 옛 브라우저를 위해
 * 밋밋한 ASCII 이름도 같이 적는다.
 */
export function attachmentHeader(raw: string | null | undefined, extension: string): string {
  const name = safeName(raw, extension);
  return `attachment; filename="photo${extension}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}
