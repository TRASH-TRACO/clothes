/**
 * ZIP 파일 만들기.
 *
 * **아무것도 안 문다.** 압축 자체는 밖에서 받는다 (`node:zlib` 의 deflateRaw).
 * 그래야 이 파일을 검사 스크립트가 그대로 돌릴 수 있고, 나중에 다른 압축으로
 * 바꾸더라도 여기를 안 건드린다.
 *
 * 묶는 건 두 가지뿐이다.
 *   - 글자 (manifest.json) 는 **압축**한다. 줄이 길어서 많이 줄어든다.
 *   - 사진(JPEG) 은 **그냥 담는다**. 이미 압축된 것이라 다시 압축해 봐야
 *     시간만 쓰고 크기는 그대로다.
 *
 * 쓰는 쪽에서 보는 것은 `zip()` 하나다 (bin/check-zip.ts 에서 바로 돌린다).
 */

export type ZipEntry = {
  /** 압축 파일 안에서의 경로. `/` 로 폴더를 나눈다 */
  name: string;
  data: Uint8Array;
  /** 압축할지. 안 적으면 그냥 담는다 */
  deflate?: boolean;
};

/** 압축 함수. 부르는 쪽이 넣어 준다 (node:zlib 의 deflateRawSync) */
export type Deflate = (data: Uint8Array) => Uint8Array;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let value = i;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function bytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** 작은 수를 작은 자리부터 담는다 (ZIP 은 전부 little-endian 이다) */
function put(view: DataView, offset: number, value: number, size: 2 | 4) {
  if (size === 2) view.setUint16(offset, value, true);
  else view.setUint32(offset, value >>> 0, true);
}

/**
 * **시각은 늘 같은 값으로 박는다.**
 *
 * 같은 내용이면 같은 파일이 나와야 한다 (바뀐 게 없는데 매일 다른 파일이
 * 쌓이면 뭐가 달라졌는지 알 수 없다). ZIP 의 시각 칸은 1980년 1월 1일이 0이다.
 */
const FIXED_TIME = 0;
const FIXED_DATE = 33; // 1980-01-01

/** 이름에 한글이 들어가도 깨지지 않게 하는 표시 (general purpose flag bit 11) */
const UTF8_FLAG = 0x800;

export function zip(entries: ZipEntry[], deflate: Deflate): Uint8Array {
  type Prepared = {
    name: Uint8Array;
    body: Uint8Array;
    crc: number;
    size: number;
    method: number;
    offset: number;
  };

  const prepared: Prepared[] = [];
  let offset = 0;
  const parts: Uint8Array[] = [];

  for (const entry of entries) {
    const name = bytes(entry.name);
    const crc = crc32(entry.data);
    // 압축한 게 더 크면 그냥 담는다 (아주 작은 파일에서 그런 일이 난다)
    let body = entry.data;
    let method = 0;
    if (entry.deflate) {
      const packed = deflate(entry.data);
      if (packed.length < entry.data.length) {
        body = packed;
        method = 8;
      }
    }

    const header = new Uint8Array(30 + name.length);
    const view = new DataView(header.buffer);
    put(view, 0, 0x04034b50, 4);
    put(view, 4, 20, 2); // 풀려면 2.0 이면 된다
    put(view, 6, UTF8_FLAG, 2);
    put(view, 8, method, 2);
    put(view, 10, FIXED_TIME, 2);
    put(view, 12, FIXED_DATE, 2);
    put(view, 14, crc, 4);
    put(view, 18, body.length, 4);
    put(view, 22, entry.data.length, 4);
    put(view, 26, name.length, 2);
    put(view, 28, 0, 2);
    header.set(name, 30);

    parts.push(header, body);
    prepared.push({ name, body, crc, size: entry.data.length, method, offset });
    offset += header.length + body.length;
  }

  const directoryStart = offset;
  for (const entry of prepared) {
    const record = new Uint8Array(46 + entry.name.length);
    const view = new DataView(record.buffer);
    put(view, 0, 0x02014b50, 4);
    put(view, 4, 20, 2);
    put(view, 6, 20, 2);
    put(view, 8, UTF8_FLAG, 2);
    put(view, 10, entry.method, 2);
    put(view, 12, FIXED_TIME, 2);
    put(view, 14, FIXED_DATE, 2);
    put(view, 16, entry.crc, 4);
    put(view, 20, entry.body.length, 4);
    put(view, 24, entry.size, 4);
    put(view, 28, entry.name.length, 2);
    put(view, 30, 0, 2); // extra
    put(view, 32, 0, 2); // comment
    put(view, 34, 0, 2); // disk
    put(view, 36, 0, 2); // internal attrs
    put(view, 38, 0, 4); // external attrs
    put(view, 42, entry.offset, 4);
    record.set(entry.name, 46);
    parts.push(record);
    offset += record.length;
  }

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  put(endView, 0, 0x06054b50, 4);
  put(endView, 4, 0, 2);
  put(endView, 6, 0, 2);
  put(endView, 8, prepared.length, 2);
  put(endView, 10, prepared.length, 2);
  put(endView, 12, offset - directoryStart, 4);
  put(endView, 16, directoryStart, 4);
  put(endView, 20, 0, 2);
  parts.push(end);

  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}
