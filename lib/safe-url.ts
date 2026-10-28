/**
 * 장바구니에 적어 둔 주소를 화면에 **링크로 걸어도 되는지**.
 *
 * 주소는 사람이 붙여넣는 값이라 그대로 href 에 넣으면 안 된다.
 * `javascript:` 로 시작하는 걸 넣어 두면 누르는 순간 그 코드가 이 페이지에서
 * 돈다 (자기 자신만 당하는 일이지만, 남이 보낸 걸 붙여넣을 수 있다).
 *
 * 그래서 **http·https 만 통과시킨다.** 나머지는 링크로 안 걸고 글자로만 둔다.
 *
 * 아무것도 안 문다 (bin/check-safe-url.ts 에서 바로 돌린다).
 */

const ALLOWED = ["http:", "https:"];

/** 링크로 걸 수 있으면 다듬은 주소, 아니면 null */
export function safeUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  // 사람은 "musinsa.com/..." 처럼 적는다. 그대로 두면 상대 경로로 읽힌다.
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) ? trimmed : `https://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }
  if (!ALLOWED.includes(parsed.protocol)) return null;
  // 호스트가 없으면 (http:///a 같은 것) 갈 곳이 없다
  if (!parsed.hostname) return null;
  return parsed.toString();
}

/** 링크에 보여줄 짧은 이름. "www.musinsa.com" 처럼 */
export function urlLabel(raw: string | null | undefined): string | null {
  const safe = safeUrl(raw);
  if (!safe) return null;
  try {
    return new URL(safe).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
