/**
 * 자를 네모 다루기 (아이폰 사진 앱의 자르기와 같은 방식).
 *
 * **자르기와 확대/축소는 따로 논다.**
 *   - 자를 네모는 모서리를 끌어 직접 정한다.
 *   - 사진은 그 밑에서 따로 끌고 키운다.
 *
 * 둘을 묶어 두면(예전 방식) "무엇을 자를지" 를 고르는 길이 사진을 끌고 키우는
 * 것밖에 없다. 세로로 긴 사진에서 가운데만 쓰고 싶어도 네모를 못 줄이니
 * 사진을 키워서 밀어 넣는 수밖에 없었다.
 *
 * 지켜야 할 것은 하나다 — **자를 네모는 늘 사진 안에 있다.** 그래야 잘라낸 자리에
 * 빈 곳이 안 생긴다. 네모를 끌 때는 사진 안으로 가두고, 사진을 끌 때는 네모를
 * 덮도록 가둔다.
 *
 * 모든 좌표는 **작업 칸 기준 CSS px** 이다. 아무것도 안 문다 (bin/check-crop-box.ts).
 */

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };
export type Rect = Point & Size;

/** 끌 수 있는 모서리 */
export type Handle = "nw" | "ne" | "sw" | "se";

export const HANDLES: Handle[] = ["nw", "ne", "sw", "se"];

/** 작업 칸 안에 사진을 통째로 넣었을 때의 자리 (contain, 가운데) */
export function fitRect(photo: Size, area: Size): Rect {
  if (photo.width <= 0 || photo.height <= 0 || area.width <= 0 || area.height <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const scale = Math.min(area.width / photo.width, area.height / photo.height);
  const width = photo.width * scale;
  const height = photo.height * scale;
  return { x: (area.width - width) / 2, y: (area.height - height) / 2, width, height };
}

function clamp(value: number, low: number, high: number) {
  // low > high 면 (칸보다 사진이 작은 경우) 가운데로 모은다
  if (low > high) return (low + high) / 2;
  return Math.min(Math.max(value, low), high);
}

/** 자를 네모를 사진 안으로 가둔다 (크기는 그대로, 자리만 옮긴다) */
export function moveCrop(crop: Rect, dx: number, dy: number, bounds: Rect): Rect {
  return {
    ...crop,
    x: clamp(crop.x + dx, bounds.x, bounds.x + bounds.width - crop.width),
    y: clamp(crop.y + dy, bounds.y, bounds.y + bounds.height - crop.height),
  };
}

/**
 * bounds 안에 들어가는 가장 큰 `ratio` 네모. center 를 가운데로 놓는다.
 * 비율을 고를 때와 처음 열 때 쓴다.
 */
export function ratioRect(bounds: Rect, ratio: number, center?: Point): Rect {
  const width = Math.min(bounds.width, bounds.height * ratio);
  const height = width / ratio;
  const middle = center ?? { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  return {
    x: clamp(middle.x - width / 2, bounds.x, bounds.x + bounds.width - width),
    y: clamp(middle.y - height / 2, bounds.y, bounds.y + bounds.height - height),
    width,
    height,
  };
}

/**
 * 모서리를 `point` 까지 끌었을 때의 새 네모.
 *
 * 끌지 않는 쪽 모서리가 기준점이라 그 자리는 안 움직인다 (아이폰과 같다).
 * `ratio` 가 있으면 비율을 지키고, 없으면 자유롭게 늘어난다.
 */
export function resizeCrop(
  crop: Rect,
  handle: Handle,
  point: Point,
  bounds: Rect,
  ratio: number | null,
  min: number,
): Rect {
  const west = handle === "nw" || handle === "sw";
  const north = handle === "nw" || handle === "ne";

  const anchor = {
    x: west ? crop.x + crop.width : crop.x,
    y: north ? crop.y + crop.height : crop.y,
  };

  // 손가락이 사진 밖으로 나가도 네모는 사진 안에서만 자란다
  const target = {
    x: clamp(point.x, bounds.x, bounds.x + bounds.width),
    y: clamp(point.y, bounds.y, bounds.y + bounds.height),
  };

  // 기준점에서 어느 쪽으로 뻗을지. 손가락이 기준점을 넘어가도 뒤집히지 않게
  // 끌던 방향을 그대로 쓴다.
  const dirX = west ? -1 : 1;
  const dirY = north ? -1 : 1;

  const roomX = dirX > 0 ? bounds.x + bounds.width - anchor.x : anchor.x - bounds.x;
  const roomY = dirY > 0 ? bounds.y + bounds.height - anchor.y : anchor.y - bounds.y;

  let width = Math.max(0, (target.x - anchor.x) * dirX);
  let height = Math.max(0, (target.y - anchor.y) * dirY);

  if (ratio) {
    // 더 많이 끈 축을 따른다
    if (width / ratio > height) height = width / ratio;
    else width = height * ratio;
  }

  // 너무 작아지지 않게. 비율이 걸려 있으면 두 변이 다 min 을 넘어야 한다.
  let lowWidth = ratio ? Math.max(min, min * ratio) : min;
  lowWidth = Math.min(lowWidth, roomX);
  let lowHeight = ratio ? lowWidth / ratio : min;
  lowHeight = Math.min(lowHeight, roomY);
  if (ratio) lowWidth = Math.min(lowWidth, lowHeight * ratio);

  width = Math.max(width, lowWidth);
  height = Math.max(height, lowHeight);
  if (ratio) height = width / ratio;

  // 사진 밖으로 넘으면 줄인다 (비율이 걸려 있으면 같이 줄인다)
  if (width > roomX) {
    width = roomX;
    if (ratio) height = width / ratio;
  }
  if (height > roomY) {
    height = roomY;
    if (ratio) width = height * ratio;
  }

  return {
    x: dirX > 0 ? anchor.x : anchor.x - width,
    y: dirY > 0 ? anchor.y : anchor.y - height,
    width,
    height,
  };
}

/**
 * 사진 자리를 가둔다 — **자를 네모를 늘 덮도록.**
 * 사진을 끌거나 키운 뒤에 부른다.
 */
export function clampPhoto(photo: Rect, crop: Rect): Rect {
  return {
    ...photo,
    x: clamp(photo.x, crop.x + crop.width - photo.width, crop.x),
    y: clamp(photo.y, crop.y + crop.height - photo.height, crop.y),
  };
}

/** 자를 네모를 덮으려면 사진이 적어도 이 배율은 돼야 한다 */
export function minScale(natural: Size, crop: Rect): number {
  if (natural.width <= 0 || natural.height <= 0) return 1;
  return Math.max(crop.width / natural.width, crop.height / natural.height);
}

/**
 * 잘라낼 자리를 `lib/image.ts` 의 cropToJpeg 가 받는 모양으로 옮긴다.
 *
 * 그쪽은 "틀 왼쪽 위가 0,0" 인 좌표를 쓴다. 여기서는 작업 칸이 0,0 이므로
 * 네모의 왼쪽 위만큼 빼 주면 된다.
 */
export function toCropView(photo: Rect, crop: Rect, scale: number) {
  return {
    frame: { width: crop.width, height: crop.height },
    offset: { x: photo.x - crop.x, y: photo.y - crop.y },
    scale,
  };
}
