const MAX_EDGE = 1600;
const QUALITY = 0.85;

/**
 * 업로드 전에 브라우저에서 리사이즈/압축한다.
 * (핸드폰 사진이 5MB씩 올라가는 걸 막기 위함)
 */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("이미지 파일만 올릴 수 있습니다.");

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return file;

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );

  return blob ?? file;
}
