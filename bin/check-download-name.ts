/**
 * 사진 내려받기 이름 확인.
 *   node --experimental-strip-types bin/check-download-name.ts
 */
import { attachmentHeader, NAME_MAX, safeName } from "../lib/download-name.ts";

/** 헤더 한 줄을 깨뜨릴 수 있는 글자가 남았는지 */
function breaksHeader(header: string) {
  return /[\r\n\u0000]/.test(header);
}

const nasty = '흰 티셔츠"\r\nSet-Cookie: stolen=1';

const checks: [string, boolean][] = [
  ["이름을 그대로 쓴다", safeName("흰 티셔츠", ".jpg") === "흰 티셔츠.jpg"],
  ["빈 이름이면 photo", safeName("", ".jpg") === "photo.jpg" && safeName(null, ".jpg") === "photo.jpg"],
  ["공백만 있어도 photo", safeName("   ", ".jpg") === "photo.jpg"],
  ["경로 구분자는 지운다", !safeName("a/b\\c", ".jpg").includes("/")],
  ["따옴표도 지운다", !safeName('아 "그" 옷', ".jpg").includes('"')],
  ["여러 칸 공백은 한 칸으로", safeName("아   그   옷", ".jpg") === "아 그 옷.jpg"],
  [
    "너무 길면 자른다",
    safeName("가".repeat(200), ".jpg").length === NAME_MAX + 4,
  ],
  ["확장자를 붙인다", safeName("코디", ".png") === "코디.png"],

  // **헤더를 깨뜨릴 수 있는 값** — 이름은 주소로 들어온다
  ["줄바꿈이 섞여도 헤더가 안 깨진다", !breaksHeader(attachmentHeader(nasty, ".jpg"))],
  [
    "끼워 넣으려던 헤더가 안 남는다",
    !attachmentHeader(nasty, ".jpg").toLowerCase().includes("set-cookie:"),
  ],
  [
    "한글은 filename* 으로 간다",
    attachmentHeader("흰 티셔츠", ".jpg").includes(
      `filename*=UTF-8''${encodeURIComponent("흰 티셔츠.jpg")}`,
    ),
  ],
  [
    "못 읽는 브라우저용 ASCII 이름도 같이 적는다",
    attachmentHeader("흰 티셔츠", ".jpg").includes('filename="photo.jpg"'),
  ],
  ["내려받으라고 말한다", attachmentHeader("코디", ".jpg").startsWith("attachment;")],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
}
console.log(failed === 0 ? `\n${checks.length}개 모두 통과` : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);
