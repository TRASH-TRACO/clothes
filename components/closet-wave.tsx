import type { CSSProperties } from "react";

import { ItemPhoto } from "@/components/item-photo";
import { seoulToday } from "@/lib/calendar";
import type { Item } from "@/lib/types";

/** 물결에 띄울 자리 수 */
const COUNT = 22;

/**
 * 실제로 받아오는 서로 다른 사진 수. 사진은 원본(긴 변 1600px)을 그대로 쓰므로
 * 자리 수만큼 다 받으면 홈이 무거워진다. 이 수를 넘으면 돌려 쓴다.
 */
const MAX_PHOTOS = 10;

/** 한 번 일렁이는 데 걸리는 시간. 느긋하게. */
const PERIOD = 12;

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 선형 합동 난수. 한 번 그리는 동안 값이 흔들리지 않게 시드를 받는다 */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function shuffled<T>(list: T[], next: () => number) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * 옷장에서 아무 옷이나 뽑아 헤드라인 뒤에 물결처럼 흘린다.
 * 글자를 가리면 안 되므로 흐리고 작게, 클릭도 안 되게 둔다.
 *
 * 뽑기는 날짜를 시드로 쓴다. 새로고침할 때마다 배치가 튀지 않고,
 * 날이 바뀌면 다른 옷이 뜬다.
 */
export function ClosetWave({ items }: { items: Item[] }) {
  // 자리표시자만 뜨면 물결이 안 보이니 사진이 있는 옷만 쓴다
  const pool = items.filter((item) => item.photo_path);
  if (pool.length < 3) return null;

  const next = rng(hash(`${seoulToday()}:${pool.length}`));
  const deck = shuffled(pool, next).slice(0, MAX_PHOTOS);

  const drops = Array.from({ length: COUNT }, (_, i) => {
    const t = (i + 0.5) / COUNT;

    // 가로로 훑으면서 그리는 한 줄기 사인 곡선
    const x = 2 + t * 96 + (next() - 0.5) * 3;
    const curveY = 50 + Math.sin(t * Math.PI * 1.8 + 0.5) * 22;

    // 곡선에서 벗어난 정도. 세 번 더해 가운데가 몰리게 한다 (은하수처럼
    // 줄기는 촘촘하고 바깥으로 갈수록 성기게)
    const drift = (next() + next() + next() - 1.5) / 1.5;
    const hug = 1 - Math.abs(drift);

    return {
      // 옷이 적으면 돌려 쓴다
      item: deck[i % deck.length],
      x,
      y: curveY + drift * 15,
      // 줄기에 가까울수록 크고 진하게
      size: 18 + hug * 32 + next() * 8,
      tilt: (next() - 0.5) * 30,
      opacity: 0.1 + hug * 0.22,
      // 좁은 화면에서는 절반만 띄운다 (글자와 겹쳐 지저분해지지 않게)
      onlyWide: i % 2 === 1,
      // 오른쪽으로 갈수록 늦게 시작해 파도가 지나가는 것처럼 보인다.
      // 음수 delay라 첫 화면부터 이미 흐르는 중이다.
      delay: -(t * PERIOD * 1.5 + next() * 0.6),
      // 줄기에 가까운(큰) 사진이 더 크게 일렁인다
      swing: 5 + hug * 8,
    };
  });

  return (
    // --wave 로 좁은 화면에서 사진을 한꺼번에 줄인다 (히어로가 낮아 크면 물결로 안 읽힌다)
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden [--wave:0.6] sm:[--wave:0.85] lg:[--wave:1]"
    >
      {drops.map((drop, i) => (
        // 바깥은 자리만 잡고, 안쪽에서 일렁인다 (transform이 서로 부딪히지 않게)
        <div
          key={i}
          className={`absolute -translate-x-1/2 -translate-y-1/2 ${
            drop.onlyWide ? "hidden sm:block" : ""
          }`}
          style={{
            left: `${drop.x}%`,
            top: `${drop.y}%`,
            width: `calc(${Math.round(drop.size)}px * var(--wave))`,
            opacity: drop.opacity,
          }}
        >
          <div
            className="wave-drift"
            style={
              {
                "--tilt": `${drop.tilt.toFixed(1)}deg`,
                "--swing": `${drop.swing.toFixed(1)}px`,
                "--dur": `${PERIOD}s`,
                "--delay": `${drop.delay.toFixed(2)}s`,
              } as CSSProperties
            }
          >
            <ItemPhoto
              path={drop.item.photo_path}
              alt=""
              category={drop.item.category}
              className="aspect-square rounded-lg"
              sizes="72px"
              compact
            />
          </div>
        </div>
      ))}
    </div>
  );
}
