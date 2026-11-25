/**
 * ZIP 만들기 확인.
 *   node --experimental-strip-types bin/check-zip.ts
 *
 * **마지막 확인은 파이썬이 한다.** 우리가 만든 걸 우리가 읽어서 맞다고 하면
 * 아무것도 증명이 안 된다. 그래서 이 스크립트가 파일을 하나 쓰고, 옆에서
 * `python3 -m zipfile` 이 그걸 풀어 본다 (bin/check-zip.sh 가 둘을 잇는다).
 */
import { deflateRawSync } from "node:zlib";
import { writeFileSync } from "node:fs";

import { crc32, zip } from "../lib/zip.ts";

const text = (value: string) => new TextEncoder().encode(value);

// 압축이 먹는 글자 (같은 줄이 반복되면 많이 줄어든다)
const long = text("옷장 백업\n".repeat(400));
const tiny = text("{}");
const binary = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

const made = zip(
  [
    { name: "manifest.json", data: long, deflate: true },
    { name: "photos/a.jpg", data: binary },
    { name: "tiny.json", data: tiny, deflate: true },
  ],
  (data) => deflateRawSync(data),
);

const u32 = (at: number) => new DataView(made.buffer, made.byteOffset).getUint32(at, true);
const u16 = (at: number) => new DataView(made.buffer, made.byteOffset).getUint16(at, true);

/** 끝 기록(EOCD)은 뒤에서 22바이트다 (주석이 없으므로) */
const eocd = made.length - 22;

const checks: [string, boolean][] = [
  // CRC32 — 값이 틀리면 푸는 쪽이 "깨졌다" 고 한다
  ["빈 값의 CRC 는 0", crc32(new Uint8Array()) === 0],
  ["아는 값이 맞는다", crc32(text("123456789")) === 0xcbf43926],
  ["한 글자도 맞는다", crc32(text("a")) === 0xe8b7be43],

  // 뼈대
  ["PK 로 시작한다", u32(0) === 0x04034b50],
  ["끝 기록이 있다", u32(eocd) === 0x06054b50],
  ["넣은 수만큼 적혀 있다", u16(eocd + 8) === 3 && u16(eocd + 10) === 3],
  ["가운데 목록 자리가 맞는다", u32(eocd + 16) + u32(eocd + 12) === eocd],
  ["가운데 목록도 PK 로 시작한다", u32(u32(eocd + 16)) === 0x02014b50],

  // 압축
  ["긴 글자는 압축된다 (method 8)", u16(8) === 8],
  ["압축한 게 원본보다 작다", u32(18) < u32(22)],
  ["원본 크기가 그대로 적혀 있다", u32(22) === long.length],
  ["한글 이름 표시가 켜져 있다", (u16(6) & 0x800) !== 0],

  // 작은 파일은 압축하면 되레 커지므로 그냥 담는다
  ["작은 글자는 그냥 담는다", (() => {
    const one = zip([{ name: "t.json", data: tiny, deflate: true }], (d) => deflateRawSync(d));
    const method = new DataView(one.buffer, one.byteOffset).getUint16(8, true);
    return method === 0;
  })()],

  // 같은 내용이면 같은 파일이어야 한다 (시각을 고정값으로 박는 이유)
  ["같은 내용은 같은 파일", (() => {
    const a = zip([{ name: "x", data: long, deflate: true }], (d) => deflateRawSync(d));
    const b = zip([{ name: "x", data: long, deflate: true }], (d) => deflateRawSync(d));
    return a.length === b.length && a.every((byte, i) => byte === b[i]);
  })()],

  ["빈 묶음도 만들어진다", (() => {
    const empty = zip([], (d) => deflateRawSync(d));
    return empty.length === 22 && new DataView(empty.buffer).getUint32(0, true) === 0x06054b50;
  })()],
];

let failed = 0;
for (const [label, ok] of checks) {
  if (!ok) failed += 1;
  console.log(`${ok ? "✓" : "✗"} ${label}`);
}

// 파이썬이 풀어 볼 파일을 남긴다
const out = process.argv[2];
if (out) {
  writeFileSync(out, made);
  console.log(`\n푼 뒤 확인할 파일: ${out}`);
}

console.log(failed === 0 ? `\n${checks.length}개 모두 통과` : `\n${failed}개 실패`);
process.exit(failed === 0 ? 0 : 1);
