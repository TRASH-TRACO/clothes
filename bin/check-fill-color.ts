/**
 * 여백을 채울 색을 고르는 규칙 확인.
 *   node --experimental-strip-types bin/check-fill-color.ts
 *
 * 캔버스가 없어도 돈다 — 픽셀 배열만 만들어 넣는다.
 */
import { edgeFill, toCss, type Rgb } from "../lib/fill-color.ts";

type Paint = (x: number, y: number) => [number, number, number, number];

/** 그리는 함수로 RGBA 배열을 만든다 */
function canvas(width: number, height: number, paint: Paint): number[] {
  const pixels: number[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) pixels.push(...paint(x, y));
  }
  return pixels;
}

const white: [number, number, number, number] = [245, 245, 245, 255];
const hotPink: [number, number, number, number] = [255, 0, 150, 255];

/** 가장자리는 흰 바탕, 가운데는 새빨간 옷 */
const studio = canvas(40, 40, (x, y) =>
  x > 10 && x < 30 && y > 10 && y < 30 ? [220, 20, 20, 255] : white,
);

/** 가장자리가 전부 짙은 남색 */
const navy = canvas(30, 30, () => [20, 30, 70, 255]);

/** 흰 가장자리인데 왼쪽 위 귀퉁이에만 형광 분홍 로고가 박혀 있다 */
const logo = canvas(40, 40, (x, y) => (x < 8 && y < 8 ? hotPink : white));

/** 거르지 않고 그냥 평균 냈으면 어떤 색이었을지 (비교용) */
function plainEdgeMean(pixels: number[], width: number, height: number): Rgb {
  const band = Math.max(1, Math.round(Math.min(width, height) * 0.14));
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!(y < band || y >= height - band || x < band || x >= width - band)) continue;
      const i = (y * width + x) * 4;
      r += pixels[i];
      g += pixels[i + 1];
      b += pixels[i + 2];
      n += 1;
    }
  }
  return { r: r / n, g: g / n, b: b / n };
}

/** 가장자리가 전부 투명 (누끼) */
const cutout = canvas(30, 30, (x, y) =>
  x > 8 && x < 22 && y > 8 && y < 22 ? [10, 10, 10, 255] : [0, 0, 0, 0],
);

/** 위아래로 색이 서서히 변하는 사진 */
const gradient = canvas(40, 40, (_x, y) => [Math.round((y / 39) * 255), 128, 60, 255]);

const near = (got: Rgb | null, want: Rgb, slack = 3) =>
  got !== null &&
  Math.abs(got.r - want.r) <= slack &&
  Math.abs(got.g - want.g) <= slack &&
  Math.abs(got.b - want.b) <= slack;

const studioFill = edgeFill(studio, 40, 40);
const logoFill = edgeFill(logo, 40, 40);
const gradientFill = edgeFill(gradient, 40, 40);
const naive = plainEdgeMean(logo, 40, 40);

const checks: [string, boolean][] = [
  // **형님이 말한 것** — 사진이랑 어울리는 색 한 가지
  ["단색 가장자리는 그 색 그대로", near(edgeFill(navy, 30, 30), { r: 20, g: 30, b: 70 }, 0)],
  ["가운데가 아무리 화려해도 가장자리를 고른다", near(studioFill, { r: 245, g: 245, b: 245 }, 0)],
  ["빨간 옷에 끌려가지 않는다", studioFill !== null && studioFill.r - studioFill.g < 10],

  // 튀는 픽셀
  ["귀퉁이 로고 하나에 안 흔들린다", near(logoFill, { r: 245, g: 245, b: 245 }, 2)],
  [
    // 이게 없으면 위 검사가 저절로 통과한다 (거르든 말든 흰색이면 의미가 없다)
    `거르지 않았으면 분홍 쪽으로 끌려갔다 (${Math.round(naive.r)},${Math.round(naive.g)},${Math.round(naive.b)})`,
    naive.r - naive.g > 15,
  ],

  // 투명·빈 것
  ["가장자리가 다 투명하면 null", edgeFill(cutout, 30, 30) === null],
  ["크기가 0 이면 null", edgeFill([], 0, 0) === null],
  ["1픽셀짜리도 안 터진다", near(edgeFill([12, 34, 56, 255], 1, 1), { r: 12, g: 34, b: 56 }, 0)],

  // 그라데이션 — 위아래 평균 어딘가로 가야지 한쪽 끝으로 쏠리면 안 된다
  ["그라데이션은 가운데쯤", gradientFill !== null && gradientFill.r > 90 && gradientFill.r < 165],

  ["CSS 색으로 적는다", toCss({ r: 1, g: 2, b: 3 }) === "rgb(1, 2, 3)"],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
}
console.log(failed === 0 ? `\n${checks.length}개 모두 통과` : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);
