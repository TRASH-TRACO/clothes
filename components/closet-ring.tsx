import type { CSSProperties } from "react";

import { ItemPhoto } from "@/components/item-photo";
import { seoulToday } from "@/lib/calendar";
import { hash, rng, shuffled } from "@/lib/seeded";
import type { Item } from "@/lib/types";

/** 사진이 도는 바깥 고리 */
const PHOTOS = { count: 8, radius: 43, size: 15, dur: 90 };

/**
 * 점이 도는 안쪽 고리들. radius 는 지름 대비 %, size 는 점 지름 %.
 * 고리마다 속도와 방향을 다르게 줘서 겹칠 때마다 무늬가 달라진다.
 */
const DOT_RINGS = [
  { count: 24, radius: 34, size: 4.6, dur: 70, reverse: true },
  { count: 18, radius: 26, size: 3.8, dur: 110, reverse: false },
  { count: 12, radius: 18, size: 3.0, dur: 85, reverse: true },
];

/**
 * 좁은 화면에서 헤드라인 뒤를 도는 고리.
 *
 * 물결은 가로로 긴 그림이라 폰에서는 글자와 겹쳐 지저분했다.
 * 대신 옷 사진과 옷 색을 동심원으로 깔고 고리마다 반대로 돌린다.
 * 가운데는 비워 두므로 글자를 가리지 않는다.
 *
 * 뽑기는 날짜를 시드로 쓴다 (하루 동안 같은 그림, 날이 바뀌면 다른 옷).
 */
export function ClosetRing({ items }: { items: Item[] }) {
  const pool = items.filter((item) => item.photo_path);
  if (pool.length < 3) return null;

  const next = rng(hash(`ring:${seoulToday()}:${pool.length}`));
  const deck = shuffled(pool, next);
  const photos = Array.from({ length: PHOTOS.count }, (_, i) => deck[i % deck.length]);

  return (
    <div
      aria-hidden
      /* 히어로 한가운데에 두면 아래쪽 날씨 카드가 고리를 거의 다 덮는다.
         헤드라인 높이에 맞춰 위로 올려서 빈 자리에 통째로 들어가게 한다. */
      className="pointer-events-none absolute left-1/2 top-[11rem] aspect-square w-[min(84vw,22rem)] -translate-x-1/2 -translate-y-1/2 sm:hidden"
    >
      {/* 무지개 번짐. 옷 색이 죄다 검정·회색이어도 화면이 심심하지 않게 깔아 둔다.
          가운데는 mask 로 뚫어 글자 뒤가 맑게 남는다. */}
      <div
        className="ring-spin absolute inset-[6%] rounded-full opacity-30 blur-2xl"
        style={
          {
            "--dur": "48s",
            background:
              "conic-gradient(from 0deg, #fa5400, #f59e0b, #22c55e, #2563eb, #a855f7, #ec4899, #fa5400)",
            maskImage: "radial-gradient(closest-side, transparent 52%, #000 72%)",
          } as CSSProperties
        }
      />

      {/* 옷 사진 고리. 고리는 돌고 사진은 반대로 돌아 똑바로 선 채 자리만 옮긴다 */}
      <div className="ring-spin absolute inset-0" style={{ "--dur": `${PHOTOS.dur}s` } as CSSProperties}>
        {photos.map((item, i) => {
          const angle = (i / PHOTOS.count) * Math.PI * 2;
          return (
            <div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{
                left: `${(50 + Math.cos(angle) * PHOTOS.radius).toFixed(2)}%`,
                top: `${(50 + Math.sin(angle) * PHOTOS.radius).toFixed(2)}%`,
                width: `${PHOTOS.size}%`,
              }}
            >
              <div
                className="ring-spin-rev opacity-45"
                style={{ "--dur": `${PHOTOS.dur}s` } as CSSProperties}
              >
                <ItemPhoto
                  path={item.photo_path}
                  alt=""
                  category={item.category}
                  className="aspect-square rounded-full"
                  sizes="64px"
                  compact
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 옷 색 점 고리 */}
      {DOT_RINGS.map((ring, r) => (
        <div
          key={r}
          className={`${ring.reverse ? "ring-spin-rev" : "ring-spin"} absolute inset-0`}
          style={{ "--dur": `${ring.dur}s` } as CSSProperties}
        >
          {Array.from({ length: ring.count }, (_, i) => {
            const angle = (i / ring.count) * Math.PI * 2;
            const item = deck[(i * 3 + r) % deck.length];
            return (
              <span
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: `${(50 + Math.cos(angle) * ring.radius).toFixed(2)}%`,
                  top: `${(50 + Math.sin(angle) * ring.radius).toFixed(2)}%`,
                  width: `${ring.size}%`,
                  aspectRatio: "1",
                  background: item.color_hex,
                  // 흰 옷은 mist 배경에 묻히므로 테두리를 하나 준다
                  boxShadow: "inset 0 0 0 1px rgb(17 17 17 / 0.08)",
                  opacity: 0.7 - r * 0.12,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
