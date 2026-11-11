/**
 * 자를 네모 규칙 확인.
 *   node --experimental-strip-types bin/check-crop-box.ts
 */
import {
  clampPhoto,
  fitRect,
  minScale,
  moveCrop,
  ratioRect,
  resizeCrop,
  toCropView,
  type Rect,
} from "../lib/crop-box.ts";

const near = (a: number, b: number, slack = 0.001) => Math.abs(a - b) < slack;
const sameRect = (a: Rect, b: Rect) =>
  near(a.x, b.x) && near(a.y, b.y) && near(a.width, b.width) && near(a.height, b.height);
const inside = (a: Rect, b: Rect) =>
  a.x >= b.x - 0.001 &&
  a.y >= b.y - 0.001 &&
  a.x + a.width <= b.x + b.width + 0.001 &&
  a.y + a.height <= b.y + b.height + 0.001;

// 400x400 작업 칸에 300x400 (세로로 긴) 사진
const area = { width: 400, height: 400 };
const photo = fitRect({ width: 300, height: 400 }, area);
const MIN = 40;

const checks: [string, boolean][] = [
  // 사진 앉히기
  ["세로 사진은 높이를 꽉 채운다", near(photo.height, 400) && near(photo.width, 300)],
  ["가운데로 온다", near(photo.x, 50) && near(photo.y, 0)],
  ["가로 사진은 너비를 꽉 채운다", near(fitRect({ width: 800, height: 400 }, area).width, 400)],
  ["빈 크기는 0", fitRect({ width: 0, height: 0 }, area).width === 0],

  // 비율 네모
  ["정사각은 짧은 변에 맞춘다", near(ratioRect(photo, 1).width, 300)],
  ["정사각이 사진 안에 있다", inside(ratioRect(photo, 1), photo)],
  ["3:4 는 사진을 다 쓴다", near(ratioRect(photo, 3 / 4).height, 400)],
  ["가운데로 온다 (세로)", near(ratioRect(photo, 1).y, 50)],
  ["가리킨 자리를 가운데로", near(ratioRect(photo, 1, { x: 200, y: 320 }).y, 100)],
  ["끝으로 가리켜도 사진 안", inside(ratioRect(photo, 1, { x: 999, y: 999 }), photo)],

  // 옮기기
  ["끈 만큼 간다", near(moveCrop(ratioRect(photo, 1), 10, -20, photo).y, 30)],
  ["사진 밖으로 안 나간다", near(moveCrop(ratioRect(photo, 1), 0, -999, photo).y, 0)],
  ["아래쪽도 막힌다", near(moveCrop(ratioRect(photo, 1), 0, 999, photo).y, 100)],
  ["옮겨도 크기는 그대로", near(moveCrop(ratioRect(photo, 1), 33, 44, photo).width, 300)],

  // 모서리 끌기 (자유)
  ["남동 모서리를 당기면 줄어든다",
    near(resizeCrop(ratioRect(photo, 1), "se", { x: 200, y: 200 }, photo, null, MIN).width, 150)],
  ["끌지 않는 모서리는 안 움직인다",
    near(resizeCrop(ratioRect(photo, 1), "se", { x: 200, y: 200 }, photo, null, MIN).x, 50)],
  ["북서를 당기면 왼쪽 위가 움직인다",
    near(resizeCrop(ratioRect(photo, 1), "nw", { x: 100, y: 100 }, photo, null, MIN).x, 100)],
  ["자유 비율은 한 변만 바뀔 수 있다",
    near(resizeCrop(ratioRect(photo, 1), "se", { x: 200, y: 350 }, photo, null, MIN).height, 300)],
  ["너무 작아지지 않는다",
    near(resizeCrop(ratioRect(photo, 1), "se", { x: 50, y: 50 }, photo, null, MIN).width, MIN)],
  ["사진 밖으로는 못 늘린다",
    inside(resizeCrop(ratioRect(photo, 1), "se", { x: 9999, y: 9999 }, photo, null, MIN), photo)],
  ["기준점을 넘겨 끌어도 안 뒤집힌다",
    resizeCrop(ratioRect(photo, 1), "se", { x: 0, y: 0 }, photo, null, MIN).width > 0],

  // 모서리 끌기 (비율 고정)
  ["비율이 지켜진다", (() => {
    const next = resizeCrop(ratioRect(photo, 1), "se", { x: 200, y: 390 }, photo, 1, MIN);
    return near(next.width, next.height);
  })()],
  ["많이 끈 축을 따른다",
    near(resizeCrop(ratioRect(photo, 1), "se", { x: 330, y: 200 }, photo, 1, MIN).width, 280)],
  ["비율 고정도 사진 밖으로 안 나간다",
    inside(resizeCrop(ratioRect(photo, 1), "se", { x: 9999, y: 9999 }, photo, 1, MIN), photo)],
  ["3:4 를 지킨다", (() => {
    const next = resizeCrop(ratioRect(photo, 3 / 4), "nw", { x: 120, y: 120 }, photo, 3 / 4, MIN);
    return near(next.width / next.height, 3 / 4);
  })()],

  // 사진 가두기
  ["네모를 덮도록 가둔다", (() => {
    const crop = ratioRect(photo, 1);
    const moved = clampPhoto({ ...photo, x: photo.x + 999 }, crop);
    return near(moved.x, crop.x);
  })()],
  ["반대쪽도 막힌다", (() => {
    const crop = ratioRect(photo, 1);
    const moved = clampPhoto({ ...photo, y: photo.y - 999 }, crop);
    return near(moved.y, crop.y + crop.height - photo.height);
  })()],
  ["덮고 있으면 안 건드린다", (() => {
    const crop = ratioRect(photo, 1);
    return sameRect(clampPhoto(photo, crop), photo);
  })()],

  // 배율 아래끝
  ["네모를 덮을 만큼은 돼야 한다",
    near(minScale({ width: 300, height: 400 }, { x: 0, y: 0, width: 150, height: 150 }), 0.5)],
  ["긴 쪽이 정한다",
    near(minScale({ width: 300, height: 400 }, { x: 0, y: 0, width: 150, height: 300 }), 0.75)],

  // 자르는 쪽으로 넘기기
  ["틀은 네모 크기", (() => {
    const view = toCropView(photo, { x: 100, y: 80, width: 200, height: 150 }, 1);
    return view.frame.width === 200 && view.frame.height === 150;
  })()],
  ["자리는 네모 왼쪽 위 기준", (() => {
    const view = toCropView({ x: 50, y: 0, width: 300, height: 400 }, { x: 100, y: 80, width: 200, height: 150 }, 1);
    return near(view.offset.x, -50) && near(view.offset.y, -80);
  })()],
  ["네모가 사진과 같으면 자리는 0", (() => {
    const view = toCropView(photo, photo, 1);
    return near(view.offset.x, 0) && near(view.offset.y, 0);
  })()],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
}
console.log(failed === 0 ? `\n${checks.length}개 모두 통과` : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);
