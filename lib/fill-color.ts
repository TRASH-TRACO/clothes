/**
 * 사진을 줄여 넣었을 때 남는 자리를 채울 **색 한 가지**.
 *
 * 예전에는 사진을 아주 작게 줄였다 다시 키워서(= 블러) 깔았다. 흐릿한 사진이
 * 사진과 맞닿으니 경계에서 둘이 섞여 보여서, 옷이 번져 나간 것처럼 보일 때가 많았다.
 *
 * **가장자리에서 뽑는다.** 채운 색이 맞닿는 곳이 사진의 가장자리라서다. 옷 사진은
 * 대개 단색 배경에 찍혀 있어서, 그 배경색이 그대로 나오면 메운 자리가 아예 안 보인다.
 * 가운데가 아무리 화려해도 가장자리가 흰 바탕이면 흰색이 맞는 답이다.
 *
 * 아무것도 안 문다 (bin/check-fill-color.ts 에서 바로 돌린다).
 */

export type Rgb = { r: number; g: number; b: number };

/**
 * 가장자리 띠의 두께 (짧은 변 대비).
 *
 * 너무 얇으면 압축 자국 한 줄에 휘둘리고, 너무 두꺼우면 가운데 물체가 섞여 든다.
 */
export const EDGE_BAND = 0.14;

/** 이보다 흐린 픽셀은 안 센다. 반투명 가장자리가 섞이면 탁해진다 */
const OPAQUE = 200;

/**
 * 평균에서 이만큼(평균 편차의 배수) 넘게 떨어진 픽셀은 빼고 다시 평균 낸다.
 *
 * 흰 바탕 귀퉁이에 박힌 로고 한 조각이 전체 색을 끌어당기는 걸 막는다.
 */
const OUTLIER = 1.5;

/** 걸러내고 이만큼도 안 남으면 거르지 않은 평균을 쓴다 */
const ENOUGH = 0.1;

/**
 * 가장자리에서 뽑은 색. 셀 만한 픽셀이 없으면 null.
 *
 * @param pixels RGBA 가 네 칸씩 늘어선 배열 (캔버스 getImageData 와 같은 모양)
 */
export function edgeFill(
  pixels: ArrayLike<number>,
  width: number,
  height: number,
): Rgb | null {
  if (width < 1 || height < 1) return null;

  const band = Math.max(1, Math.round(Math.min(width, height) * EDGE_BAND));
  const edge: Rgb[] = [];

  for (let y = 0; y < height; y += 1) {
    const outerRow = y < band || y >= height - band;
    for (let x = 0; x < width; x += 1) {
      // 위아래 띠는 가로로 다 세고, 가운데 줄은 좌우 끝만 센다
      if (!outerRow && x >= band && x < width - band) continue;
      const i = (y * width + x) * 4;
      if (pixels[i + 3] < OPAQUE) continue;
      edge.push({ r: pixels[i], g: pixels[i + 1], b: pixels[i + 2] });
    }
  }

  if (edge.length === 0) return null;

  const plain = mean(edge);
  // 평균에서 얼마나 떨어져 있는지의 평균. 다 같은 색이면 0 이라 거를 것도 없다.
  const spread = edge.reduce((sum, pixel) => sum + distance(pixel, plain), 0) / edge.length;
  if (spread === 0) return round(plain);

  const kept = edge.filter((pixel) => distance(pixel, plain) <= spread * OUTLIER);
  if (kept.length < edge.length * ENOUGH) return round(plain);
  return round(mean(kept));
}

function mean(list: Rgb[]): Rgb {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const pixel of list) {
    r += pixel.r;
    g += pixel.g;
    b += pixel.b;
  }
  return { r: r / list.length, g: g / list.length, b: b / list.length };
}

function distance(a: Rgb, b: Rgb): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

function round({ r, g, b }: Rgb): Rgb {
  return { r: Math.round(r), g: Math.round(g), b: Math.round(b) };
}

export function toCss({ r, g, b }: Rgb): string {
  return `rgb(${r}, ${g}, ${b})`;
}
