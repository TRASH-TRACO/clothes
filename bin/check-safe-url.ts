/**
 * 장바구니 링크를 걸어도 되는지 가리는 규칙 확인.
 *   node --experimental-strip-types bin/check-safe-url.ts
 */
import { safeUrl, urlLabel } from "../lib/safe-url.ts";

const checks: [string, boolean][] = [
  ["평범한 주소는 그대로", safeUrl("https://www.musinsa.com/app/goods/123") === "https://www.musinsa.com/app/goods/123"],
  ["http 도 된다", safeUrl("http://example.com/a") === "http://example.com/a"],
  ["앞뒤 공백은 턴다", safeUrl("  https://example.com/a  ") === "https://example.com/a"],
  [
    "체계를 안 적으면 https 로 본다 (사람은 그렇게 붙여넣는다)",
    safeUrl("musinsa.com/app/goods/123") === "https://musinsa.com/app/goods/123",
  ],
  ["물음표 뒤 값도 안 잃는다", safeUrl("https://a.com/b?c=1&d=2") === "https://a.com/b?c=1&d=2"],

  // **막아야 하는 것** — 눌렀을 때 이 페이지에서 코드가 돌면 안 된다
  ["javascript: 는 안 건다", safeUrl("javascript:alert(1)") === null],
  ["대문자로 숨겨도 안 건다", safeUrl("JavaScript:alert(1)") === null],
  ["앞에 공백을 넣어도 안 건다", safeUrl("  javascript:alert(1)") === null],
  ["data: 도 안 건다", safeUrl("data:text/html,<script>alert(1)</script>") === null],
  ["file: 도 안 건다", safeUrl("file:///etc/passwd") === null],
  ["vbscript: 도 안 건다", safeUrl("vbscript:msgbox(1)") === null],

  // 빈 값
  ["빈 값은 null", safeUrl("") === null && safeUrl(null) === null && safeUrl(undefined) === null],
  ["공백만 있어도 null", safeUrl("   ") === null],
  ["주소가 아니면 null", safeUrl("https://") === null],

  // 보여줄 이름
  ["보여줄 이름은 호스트", urlLabel("https://www.musinsa.com/a/b") === "musinsa.com"],
  ["www 만 떼고 나머지는 둔다", urlLabel("https://shop.example.co.kr/a") === "shop.example.co.kr"],
  ["못 거는 주소는 이름도 없다", urlLabel("javascript:alert(1)") === null],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
}
console.log(failed === 0 ? `\n${checks.length}개 모두 통과` : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);
