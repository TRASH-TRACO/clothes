import { RailSwing, type Hanger } from "@/components/rail-swing";
import { seoulToday } from "@/lib/calendar";
import { hash, rng, shuffled } from "@/lib/seeded";
import type { Item } from "@/lib/types";

/** 봉에 걸 옷 수. 폭 390px 기준으로 서로 살짝 겹칠 만큼 */
const COUNT = 9;

/**
 * 좁은 화면에서 헤드라인 뒤에 거는 옷걸이.
 *
 * 화면 위 어딘가에 걸린 옷이 바람에 흔들린다. **손으로 좌우로 그으면 그게 바람이다**
 * (흔들리는 계산은 lib/pendulum.ts, 돌리는 쪽은 components/rail-swing.tsx).
 * 봉은 그리지 않는다 — 맨 위에 붙여 두면 선이 안 보이는 쪽이 깔끔하다.
 * 아래로 갈수록 흐려지므로 헤드라인과 날씨 카드를 건드리지 않는다.
 *
 * 뽑기는 날짜를 시드로 쓴다 (하루 동안 같은 그림, 날이 바뀌면 다른 옷).
 * 서버에서 뽑아 넘기는 이유: 브라우저에서 다시 뽑으면 서버가 그린 것과 달라진다.
 */
export function ClosetRail({ items }: { items: Item[] }) {
  // 자리표시자만 걸리면 옷걸이로 안 보이니 사진이 있는 옷만 쓴다
  const pool = items.filter((item) => item.photo_path);
  if (pool.length < 3) return null;

  const next = rng(hash(`rail:${seoulToday()}:${pool.length}`));
  const deck = shuffled(pool, next);

  const hangers: Hanger[] = Array.from({ length: COUNT }, (_, i) => {
    // 옷이 적으면 돌려 쓴다
    const item = deck[i % deck.length];
    // 고리 길이. 제각각이라 아래쪽이 스카이라인처럼 들쭉날쭉해진다
    const drop = 14 + next() * 26;
    const width = 32 + next() * 12;

    return {
      photoPath: item.photo_path,
      category: item.category,
      // 봉을 따라 고르게 늘어놓고 조금씩 흔들어 준다
      left: 9 + (i * 82) / (COUNT - 1) + (next() - 0.5) * 2,
      drop,
      width,
      shape: {
        // 걸린 자리에서 옷 한가운데까지. 이게 진자의 길이라 **길게 걸린 옷이
        // 저절로 느리게 흔들린다** — 따로 속도를 정해 주지 않아도 된다.
        length: drop + (width * 4) / 3 / 2,
        // 넓은 옷이 바람을 더 받는다 (면적/무게)
        drag: 0.5 + (width / 44) * 0.4 + next() * 0.2,
        damping: 0.8 + next() * 0.5,
      },
      // 처음부터 조금씩 어긋나 있어야 줄 맞춰 흔들리지 않는다
      angle: (next() - 0.5) * 0.12,
      phase: next() * Math.PI * 2,
    };
  });

  return <RailSwing hangers={hangers} />;
}
