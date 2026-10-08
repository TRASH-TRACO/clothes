import { edgeFill, toCss } from "./fill-color";

const MAX_EDGE = 1600;
const QUALITY = 0.85;

/**
 * 투명한 부분을 채울 기본색. globals.css 의 `--color-mist` 와 같은 값이다.
 *
 * JPEG에는 투명이 없다. 그래서 누끼 딴 PNG를 그냥 JPEG로 바꾸면 투명했던 자리가
 * **검정**이 된다 (캔버스는 아무것도 안 그리면 투명이고, 투명은 JPEG에서 검정으로
 * 떨어진다). 검은 신발 누끼를 올리면 신발과 배경이 붙어서 아예 안 보였다.
 *
 * 누끼 사진이면 옷 색에서 바탕색을 뽑아 쓰고(readBackdrop), 그 밖에는 이 색이다.
 * `ItemPhoto` 의 바탕이 mist 라서 사진 테두리가 안 보이고 카드에 녹아든다.
 */
const FLATTEN_COLOR = "#f5f5f5";

/** 바탕색을 뽑을 때 줄이는 크기. 색 통계만 보면 되므로 작아도 된다 */
const SAMPLE_EDGE = 64;

/** 이 비율 이상이 비어 있으면 누끼 딴 사진으로 본다 */
const CUTOUT_RATIO = 0.05;

/** 0~1 RGB → [색상(도), 채도, 밝기] */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) * 60
      : max === g
        ? ((b - r) / d + 2) * 60
        : ((r - g) / d + 4) * 60;
  return [h, s, l];
}

/**
 * 누끼 딴 사진인지 보고, 맞으면 **옷 색에서 뽑은 바탕색**을 돌려준다.
 *
 * 상품 사진 미리보기가 하는 것과 같다. 회색 티셔츠면 아주 연한 회색,
 * 빨간 신발이면 아주 연한 붉은색이 깔려서 옷이 배경에 얹힌 것처럼 보인다.
 *
 * - 색상만 그대로 두고 **채도는 확 낮춘다.** 진하게 깔면 옷보다 배경이 먼저 보인다.
 *   무채색 옷이면 채도가 0이라 그대로 mist 와 같은 회색이 된다.
 * - **밝은 옷이면 바탕을 조금 낮춘다.** 흰 티셔츠를 흰 바탕에 놓으면 묻힌다.
 * - 그림자처럼 반투명한 가장자리는 색 통계에서 뺀다. 섞이면 탁해진다.
 */
export type Backdrop = {
  /** 투명한 자리를 메울 색 */
  color: string;
  /** 사진이 프레임을 다 못 덮을 때 그 여백을 메울 색. 사진 가장자리에서 뽑는다 */
  fill: string;
  /** 누끼 딴 사진인지 */
  cutout: boolean;
};

export function readBackdrop(image: HTMLImageElement): Backdrop {
  const canvas = document.createElement("canvas");
  const ratio = Math.min(1, SAMPLE_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return { color: FLATTEN_COLOR, cutout: false, fill: FLATTEN_COLOR };
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let pixels: Uint8ClampedArray;
  try {
    pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  } catch {
    // 다른 출처에서 온 이미지는 픽셀을 읽을 수 없다. 그때는 기본색으로 둔다.
    return { color: FLATTEN_COLOR, cutout: false, fill: FLATTEN_COLOR };
  }

  let clear = 0;
  let solid = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const alpha = pixels[i + 3];
    if (alpha < 16) {
      clear += 1;
      continue;
    }
    if (alpha < 200) continue;
    solid += 1;
    r += pixels[i];
    g += pixels[i + 1];
    b += pixels[i + 2];
  }

  const cutout = clear / (pixels.length / 4) >= CUTOUT_RATIO;

  // 여백을 채울 색. 같은 픽셀을 한 번 더 훑는 셈이지만 작게 줄여 둔 것이라 금방이다.
  const edge = edgeFill(pixels, canvas.width, canvas.height);
  const fill = edge ? toCss(edge) : FLATTEN_COLOR;

  if (!cutout || solid === 0) return { color: FLATTEN_COLOR, cutout, fill };

  const [hue, saturation, lightness] = rgbToHsl(r / solid / 255, g / solid / 255, b / solid / 255);
  const tint = Math.min(saturation, 0.7) * 0.32;
  // 무채색 옷이면 카드 바탕(mist)과 똑같은 값이라 사진 경계가 아예 안 보인다.
  // 색이 있으면 눈에 띄게는 깔되, 옷보다 먼저 보이지 않을 만큼만 낮춘다.
  const level = lightness > 0.78 ? 0.9 : tint < 0.02 ? 0.96 : 0.945;
  const tinted = `hsl(${Math.round(hue)}, ${Math.round(tint * 100)}%, ${Math.round(level * 100)}%)`;
  // 누끼 사진은 가장자리가 투명이라 뽑을 색이 없다. 옷 색에서 만든 바탕색을 쓴다.
  return { color: tinted, cutout, fill: edge ? fill : tinted };
}

/** 크롭 화면의 상태. offset은 프레임 좌상단 기준 이미지 좌상단 위치(CSS px) */
export type CropView = {
  frame: { width: number; height: number };
  offset: { x: number; y: number };
  /** 원본 1px이 화면에서 차지하는 CSS px */
  scale: number;
};

/**
 * 파일을 <img>로 읽어들인다.
 * 크롭 미리보기와 최종 출력이 같은 요소를 쓰도록 해서
 * EXIF 회전이 다르게 적용되는 일이 없게 한다.
 * 반환된 url은 다 쓴 뒤 revokeObjectURL 해야 한다.
 */
export function loadImage(
  file: File,
): Promise<{ image: HTMLImageElement; url: string }> {
  if (!file.type.startsWith("image/")) {
    return Promise.reject(new Error("이미지 파일만 올릴 수 있습니다."));
  }

  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ image, url });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 읽지 못했습니다."));
    };
    image.src = url;
  });
}

/** 사진이 프레임을 빈틈없이 덮는지. 0.5px 쯤의 반올림 오차는 덮은 것으로 본다 */
export function coversFrame(image: HTMLImageElement, view: CropView): boolean {
  const epsilon = 0.5;
  const width = image.naturalWidth * view.scale;
  const height = image.naturalHeight * view.scale;
  return (
    view.offset.x <= epsilon &&
    view.offset.y <= epsilon &&
    view.offset.x + width >= view.frame.width - epsilon &&
    view.offset.y + height >= view.frame.height - epsilon
  );
}

/**
 * 사진 뒤에 깔 색.
 *
 * **크롭 화면과 저장 결과가 같은 색을 써야 한다.** 예전에는 크롭 화면이 흐린 사진을
 * 깔고 저장은 다른 걸 깔아서, 자르기 전과 후의 배경이 서로 달랐다.
 */
export function backdropColor(backdrop: Backdrop, covers: boolean): string {
  // 다 덮으면 여백이 없다. 그때 깔아 둔 색은 투명한 자리에만 비친다.
  return covers ? backdrop.color : backdrop.fill;
}

/**
 * 프레임에 보이는 그대로를 JPEG로 인코딩한다.
 *
 * 원본보다 축소해서 여백이 생기면 **사진 가장자리에서 뽑은 색 한 가지**로 채운다
 * (lib/fill-color.ts). 예전에는 사진을 뭉갠 블러를 깔았는데, 흐릿한 사진이 사진과
 * 맞닿으니 경계에서 둘이 섞여 옷이 번져 나간 것처럼 보일 때가 많았다.
 *
 * 긴 변이 MAX_EDGE를 넘으면 줄인다 (핸드폰 사진이 5MB씩 올라가는 걸 막기 위함).
 */
export async function cropToJpeg(
  image: HTMLImageElement,
  view: CropView,
  quality = QUALITY,
): Promise<Blob> {
  // scale로 나누면 프레임에 보이는 영역이 원본 픽셀로 몇 인지가 나온다
  const nativeWidth = view.frame.width / view.scale;
  const nativeHeight = view.frame.height / view.scale;
  const shrink = Math.min(1, MAX_EDGE / Math.max(nativeWidth, nativeHeight));

  const width = Math.max(1, Math.round(nativeWidth * shrink));
  const height = Math.max(1, Math.round(nativeHeight * shrink));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("이미지를 처리할 수 없습니다.");

  const backdrop = readBackdrop(image);

  // 프레임 좌표 → 출력 좌표
  const k = width / view.frame.width;
  const dx = view.offset.x * k;
  const dy = view.offset.y * k;
  const dw = image.naturalWidth * view.scale * k;
  const dh = image.naturalHeight * view.scale * k;

  // 먼저 바탕을 깐다. 두 가지를 한꺼번에 한다.
  //   1) 사진이 프레임을 다 못 덮으면 그 여백을 메운다 (가장자리에서 뽑은 색).
  //   2) 투명한 자리가 검정으로 떨어지지 않게 막는다. JPEG 에는 투명이 없어서,
  //      안 깔면 누끼 딴 PNG 의 투명했던 자리가 전부 검정이 된다.
  // 다 덮는 불투명 사진이면 어차피 위에 가려지므로 달라지는 게 없다.
  // 크롭 화면도 같은 색을 깐다 (components/photo-cropper.tsx).
  context.fillStyle = backdropColor(backdrop, coversFrame(image, view));
  context.fillRect(0, 0, width, height);

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, dx, dy, dw, dh);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) throw new Error("이미지 변환에 실패했습니다.");
  return blob;
}

/** 실측표 사진을 모델에 보낼 때 줄이는 크기. 글씨가 읽힐 만큼은 남겨야 한다 */
const READ_EDGE = 1400;

/**
 * 사진을 자르지 않고 줄이기만 해서 JPEG 로 만든다.
 *
 * 실측표 스크린샷을 모델에 보낼 때 쓴다. 잘라내면 표가 잘리므로 크롭은 안 한다.
 * 원본을 그대로 보내면 몇 MB 씩 되어 서버 액션 본문 제한에 걸린다.
 */
export async function shrinkForReading(
  file: File,
  maxEdge = READ_EDGE,
  quality = QUALITY,
): Promise<{ blob: Blob; width: number; height: number }> {
  const { image, url } = await loadImage(file);
  try {
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("이미지를 처리할 수 없습니다.");

    // 투명한 자리가 검정이 되지 않게 (누끼 딴 상품 사진이 흔하다)
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );
    if (!blob) throw new Error("이미지 변환에 실패했습니다.");
    return { blob, width, height };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Blob → base64 (data: 접두사 없이). 모델에 실어 보낼 모양 */
export async function toBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  // 한 번에 넘기면 인자 수 제한에 걸린다
  for (let i = 0; i < bytes.length; i += 8192) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  }
  return btoa(binary);
}
