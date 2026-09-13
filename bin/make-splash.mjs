/**
 * iOS 켤 때 뜨는 화면을 만든다 (public/splash/).
 *   node bin/make-splash.mjs
 *
 * iOS 는 기기 크기가 정확히 맞는 그림만 쓴다. 하나라도 없으면 그 기기에서는
 * 빈 화면(까만 화면)이 뜬다. 그래서 아이폰 세로 크기를 다 만들어 둔다.
 * 크기를 더할 때는 여기와 app/layout.tsx 의 startupImage 를 같이 고친다.
 *
 * playwright 가 필요하다 (devDependency 아님 — 그림은 한 번 만들어 커밋한다).
 */
import { chromium } from "playwright";
import fs from "node:fs";

/** [CSS 폭, CSS 높이, 배율] — 아이폰 세로 기준 */
const DEVICES = [
  [440, 956, 3], [430, 932, 3], [428, 926, 3], [402, 874, 3],
  [393, 852, 3], [390, 844, 3], [375, 812, 3], [414, 896, 3],
  [414, 896, 2], [414, 736, 3], [375, 667, 2],
];

const icon = fs.readFileSync("public/icon-512.png").toString("base64");
const b = await chromium.launch();

const made = [];
for (const [w, h, dpr] of DEVICES) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  await p.setContent(`<!doctype html><meta charset="utf-8">
    <style>
      html,body{margin:0;height:100%}
      body{background:#ffffff;display:flex;align-items:center;justify-content:center}
      img{width:${Math.round(Math.min(w, h) * 0.28)}px;height:auto;border-radius:22%}
    </style>
    <img src="data:image/png;base64,${icon}" alt="">`);
  await p.waitForTimeout(120);
  const name = `public/splash/${w * dpr}x${h * dpr}.png`;
  await p.screenshot({ path: name });
  made.push([name, w, h, dpr]);
  await p.close();
}
await b.close();
console.log(made.map(([n]) => n).join("\n"));
