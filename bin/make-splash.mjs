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

/**
 * [CSS 폭, CSS 높이, 배율] — 아이폰 세로 기준.
 *
 * 설정 > 디스플레이에서 "확대 보기"를 켜면 같은 기기가 다른 크기를 말한다.
 * 그 크기도 넣어 둬야 확대 보기를 쓰는 사람한테도 그림이 뜬다.
 */
const DEVICES = [
  [440, 956, 3], // 16 Pro Max, 17 Pro Max
  [430, 932, 3], // 14/15/16 Pro Max, 15/16 Plus
  [428, 926, 3], // 12/13/14 Pro Max
  [420, 912, 3], // Air
  [402, 874, 3], // 16 Pro, 17
  [393, 852, 3], // 14 Pro, 15, 16, 16e
  [390, 844, 3], // 12, 13, 14
  [375, 812, 3], // X, XS, 11 Pro, 13 mini
  [414, 896, 3], // XS Max, 11 Pro Max
  [414, 896, 2], // XR, 11
  [414, 736, 3], // 6/7/8 Plus
  [375, 667, 2], // 6/7/8, SE 2/3
  [360, 780, 3], // 12 mini
  [320, 568, 2], // SE 1
  [320, 693, 3], // 확대 보기 (393x852 기기)
  [320, 690, 3], // 확대 보기 (390x844 기기)
  [360, 800, 3], // 확대 보기 (402x874 기기)
];

const icon = fs.readFileSync("public/icon-512.png").toString("base64");
// 크롬이 기본 자리에 없는 환경에서는 CHROMIUM_PATH 로 알려 준다
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });

const made = [];
for (const [w, h, dpr] of DEVICES) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dpr });
  // 맨 위 검은 띠는 앱의 .status-band 와 같은 높이·색이다 (globals.css).
  // 상태바 글씨가 흰색이라 이게 없으면 흰 바탕에 흰 시계가 돼서 안 보이고,
  // 앱이 뜨는 순간 띠가 생기면서 화면이 덜컥 움직인다.
  await p.setContent(`<!doctype html><meta charset="utf-8">
    <style>
      html,body{margin:0;height:100%}
      body{background:#ffffff;display:flex;align-items:center;justify-content:center}
      .band{position:fixed;top:0;left:0;right:0;height:64px;background:#111111}
      img{width:${Math.round(Math.min(w, h) * 0.28)}px;height:auto;border-radius:22%}
    </style>
    <div class="band"></div>
    <img src="data:image/png;base64,${icon}" alt="">`);
  await p.waitForTimeout(120);
  const name = `public/splash/${w * dpr}x${h * dpr}.png`;
  await p.screenshot({ path: name });
  made.push([name, w, h, dpr]);
  await p.close();
}
await b.close();
console.log(made.map(([n]) => n).join("\n"));
