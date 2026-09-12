const MAX_EDGE = 1600;
const QUALITY = 0.85;
/** 블러 배경을 만들 때 한 번 줄였다가 다시 키우는 크기 */
const BACKDROP_EDGE = 48;

/**
 * 투명한 부분을 채울 색. globals.css 의 `--color-mist` 와 같은 값이다.
 *
 * JPEG에는 투명이 없다. 그래서 누끼 딴 PNG를 그냥 JPEG로 바꾸면 투명했던 자리가
 * **검정**이 된다 (캔버스는 아무것도 안 그리면 투명이고, 투명은 JPEG에서 검정으로
 * 떨어진다). 검은 신발 누끼를 올리면 신발과 배경이 붙어서 아예 안 보였다.
 *
 * 흰색 대신 이 색을 쓰는 이유는 `ItemPhoto` 의 바탕이 mist 라서다. 같은 색으로
 * 깔면 사진 테두리가 안 보이고 옷만 떠 있는 것처럼 카드에 녹아든다
 * (상품 사진 미리보기가 흰색이 아니라 아주 연한 회색을 쓰는 것과 같은 이유다).
 */
const FLATTEN_COLOR = "#f5f5f5";

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

/**
 * 여백을 채울 블러 배경.
 * ctx.filter는 브라우저마다 지원이 갈려서, 아주 작게 줄였다가 다시 키우는
 * 방식으로 번지게 만든다. (어디서나 같은 결과가 나온다)
 */
function drawBlurredBackdrop(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const small = document.createElement("canvas");
  const ratio = Math.min(BACKDROP_EDGE / width, BACKDROP_EDGE / height);
  small.width = Math.max(1, Math.round(width * ratio));
  small.height = Math.max(1, Math.round(height * ratio));

  const smallContext = small.getContext("2d");
  if (!smallContext) return;

  // 작은 캔버스를 원본으로 꽉 채운다(cover)
  const cover = Math.max(
    small.width / image.naturalWidth,
    small.height / image.naturalHeight,
  );
  const coverWidth = image.naturalWidth * cover;
  const coverHeight = image.naturalHeight * cover;
  smallContext.drawImage(
    image,
    (small.width - coverWidth) / 2,
    (small.height - coverHeight) / 2,
    coverWidth,
    coverHeight,
  );

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(small, 0, 0, width, height);
}

/**
 * 프레임에 보이는 그대로를 JPEG로 인코딩한다.
 * 원본보다 축소해서 여백이 생긴 경우에는 블러 배경으로 채운다.
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

  // 투명한 자리가 검정으로 떨어지지 않게 먼저 깔아 둔다.
  // 불투명한 사진이면 어차피 위에 덮이므로 달라지는 게 없다.
  context.fillStyle = FLATTEN_COLOR;
  context.fillRect(0, 0, width, height);

  // 프레임 좌표 → 출력 좌표
  const k = width / view.frame.width;
  const dx = view.offset.x * k;
  const dy = view.offset.y * k;
  const dw = image.naturalWidth * view.scale * k;
  const dh = image.naturalHeight * view.scale * k;

  const epsilon = 0.5;
  const covers =
    dx <= epsilon &&
    dy <= epsilon &&
    dx + dw >= width - epsilon &&
    dy + dh >= height - epsilon;
  if (!covers) drawBlurredBackdrop(context, image, width, height);

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, dx, dy, dw, dh);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  if (!blob) throw new Error("이미지 변환에 실패했습니다.");
  return blob;
}
