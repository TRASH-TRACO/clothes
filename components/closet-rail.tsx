import type { CSSProperties } from "react";

import { ItemPhoto } from "@/components/item-photo";
import { seoulToday } from "@/lib/calendar";
import { hash, rng, shuffled } from "@/lib/seeded";
import type { Item } from "@/lib/types";

/** 봉에 걸 옷 수. 폭 390px 기준으로 서로 살짝 겹칠 만큼 */
const COUNT = 9;

/** 봉이 히어로 위에서 내려온 거리 */
const RAIL_TOP = "1.75rem";

/**
 * 좁은 화면에서 헤드라인 뒤에 거는 옷걸이.
 *
 * 옷장 봉에 옷이 걸려 있고 저마다 다른 속도로 흔들린다.
 * 길이·크기를 어긋나게 줘서 한 줄로 늘어선 티가 안 나게 했다.
 * 아래로 갈수록 흐려지므로 헤드라인과 날씨 카드를 건드리지 않는다.
 *
 * 뽑기는 날짜를 시드로 쓴다 (하루 동안 같은 그림, 날이 바뀌면 다른 옷).
 */
export function ClosetRail({ items }: { items: Item[] }) {
  // 자리표시자만 걸리면 옷걸이로 안 보이니 사진이 있는 옷만 쓴다
  const pool = items.filter((item) => item.photo_path);
  if (pool.length < 3) return null;

  const next = rng(hash(`rail:${seoulToday()}:${pool.length}`));
  const deck = shuffled(pool, next);

  const hangers = Array.from({ length: COUNT }, (_, i) => ({
    // 옷이 적으면 돌려 쓴다
    item: deck[i % deck.length],
    // 봉을 따라 고르게 늘어놓고 조금씩 흔들어 준다
    left: 9 + (i * 82) / (COUNT - 1) + (next() - 0.5) * 2,
    // 고리 길이. 제각각이라 아래쪽이 스카이라인처럼 들쭉날쭉해진다
    drop: 14 + next() * 26,
    width: 32 + next() * 12,
    // 짧게 걸린 옷이 더 빨리 흔들린다 (진자처럼)
    dur: 4.2 + next() * 2.6,
    swing: 2 + next() * 1.4,
    // 음수 delay라 첫 화면부터 이미 흔들리는 중이다
    delay: -next() * 5,
  }));

  return (
    <div
      aria-hidden
      className="rail-fade pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden sm:hidden"
    >
      {/* 옷장 봉 */}
      <div className="absolute inset-x-4 h-px bg-ink/25" style={{ top: RAIL_TOP }} />

      {hangers.map((hanger, i) => (
        <div
          key={i}
          className="rail-hang absolute -translate-x-1/2 opacity-30"
          style={
            {
              left: `${hanger.left.toFixed(2)}%`,
              top: RAIL_TOP,
              width: `${hanger.width.toFixed(1)}px`,
              "--dur": `${hanger.dur.toFixed(2)}s`,
              "--swing": `${hanger.swing.toFixed(2)}deg`,
              "--delay": `${hanger.delay.toFixed(2)}s`,
            } as CSSProperties
          }
        >
          {/* 봉에서 옷까지 내려오는 고리 */}
          <div className="mx-auto w-px bg-ink/30" style={{ height: `${hanger.drop.toFixed(1)}px` }} />
          <ItemPhoto
            path={hanger.item.photo_path}
            alt=""
            category={hanger.item.category}
            className="aspect-[3/4] w-full rounded-[5px]"
            sizes="64px"
            compact
          />
        </div>
      ))}
    </div>
  );
}
