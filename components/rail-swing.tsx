"use client";

import { useEffect, useRef } from "react";

import { ItemPhoto } from "@/components/item-photo";
import type { Category } from "@/lib/categories";
import { step, type Shape, type Swing } from "@/lib/pendulum";

export type Hanger = {
  photoPath: string | null;
  category: Category;
  /** 봉 위에서의 자리 (%) */
  left: number;
  /** 고리 길이 (px) */
  drop: number;
  /** 옷 너비 (px) */
  width: number;
  shape: Shape;
  /** 처음 각도. 다 0 에서 시작하면 줄 맞춰 흔들려서 기계 같다 */
  angle: number;
  /** 산들바람의 위상. 옷마다 어긋나야 한 덩어리로 안 움직인다 */
  phase: number;
};

/** 손 속도를 바람으로 바꾸는 비율. 손가락은 초당 1000px 도 지나간다 */
const HAND_GAIN = 0.3;

/** 아무리 빨리 그어도 이 이상은 안 분다 (px/s) */
const HAND_MAX = 340;

/** 손을 멈추면 바람이 잦아드는 시간 (초) */
const HAND_DECAY = 0.22;

/**
 * 손에서 멀어질수록 약해지는 거리 (px).
 *
 * 손이 지나간 자리 바로 아래 옷이 제일 세게 밀리고 멀수록 덜 밀린다.
 * 이게 없으면 화면 끝을 건드려도 아홉 벌이 한꺼번에 움직여서 가짜 같다.
 */
const REACH = 110;

/**
 * 손을 안 대도 부는 산들바람 (px/s).
 *
 * 멈춰 서는 각도가 atan(drag·바람/중력) 이라, 이 값이면 ±3° 안에서 논다.
 * 원래 CSS 로 흔들던 폭(±2~3°)과 같게 맞춘 것이다 — 배경이 그보다 크게
 * 움직이면 헤드라인을 읽는 데 방해가 된다.
 */
const BREEZE = 12;

/** 탭을 갔다 오면 dt 가 몇 초씩 들어온다. 그만큼 한 번에 밀지 않는다 */
const MAX_FRAME = 0.1;

/**
 * 봉에 걸린 옷이 바람에 흔들린다.
 *
 * 손을 좌우로 그으면 그게 바람이다. 옷마다 진자로 풀어서 (lib/pendulum.ts)
 * 길게 걸린 옷은 느리게, 짧게 걸린 옷은 빠르게 흔들린다. 손을 멈추면 관성으로
 * 한 번 더 넘어갔다가 되돌아온다 — 바람 항에서 옷의 가로 속도를 빼기 때문이다.
 *
 * 각도는 리액트 밖에서 DOM 에 직접 쓴다. 초당 60번 다시 그릴 이유가 없다.
 */
export function RailSwing({ hangers }: { hangers: Hanger[] }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const nodes = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    // 흔들리는 걸 싫어하는 사람에게는 안 흔든다
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const swings: Swing[] = hangers.map((hanger) => ({ angle: hanger.angle, speed: 0 }));
    /** 각 옷이 화면에서 가로로 어디쯤인지 (px). 손과의 거리를 재려면 필요하다 */
    let centers: number[] = [];

    function measure() {
      const rect = box!.getBoundingClientRect();
      centers = hangers.map((hanger) => rect.left + (rect.width * hanger.left) / 100);
    }
    measure();

    let hand = 0;
    let handX = 0;
    let lastX: number | null = null;
    let lastAt = 0;

    function onMove(event: PointerEvent) {
      const now = event.timeStamp;
      if (lastX !== null && now > lastAt) {
        const speed = ((event.clientX - lastX) / (now - lastAt)) * 1000;
        const blown = speed * HAND_GAIN;
        hand = Math.max(-HAND_MAX, Math.min(HAND_MAX, blown));
      }
      handX = event.clientX;
      lastX = event.clientX;
      lastAt = now;
    }

    function onLeave() {
      lastX = null;
    }

    let raf = 0;
    let last = performance.now();

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, MAX_FRAME);
      last = now;

      // 손을 떼거나 멈추면 바람이 잦아든다
      hand *= Math.exp(-dt / HAND_DECAY);
      const clock = now / 1000;

      for (let i = 0; i < hangers.length; i += 1) {
        const hanger = hangers[i];
        // 손에서 멀수록 약하게. 1 / (1 + (거리/REACH)²) 이라 부드럽게 잦아든다
        const away = (centers[i] - handX) / REACH;
        const reach = 1 / (1 + away * away);
        const breeze =
          BREEZE * Math.sin(clock * 0.63 + hanger.phase) +
          BREEZE * 0.6 * Math.sin(clock * 1.07 + hanger.phase * 1.7);

        swings[i] = step(swings[i], hanger.shape, hand * reach + breeze, dt);

        const node = nodes.current[i];
        // rotate 는 transform 과 따로 쌓인다. Tailwind 의 -translate-x-1/2 를 안 지운다.
        if (node) node.style.rotate = `${((swings[i].angle * 180) / Math.PI).toFixed(2)}deg`;
      }
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      if (!raf) return;
      cancelAnimationFrame(raf);
      raf = 0;
    }

    /** 안 보이는데 초당 60번 돌 이유가 없다 (배터리) */
    function onVisible() {
      if (document.hidden) stop();
      else start();
    }

    const seen = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !document.hidden) start();
      else stop();
    });
    seen.observe(box);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onLeave, { passive: true });
    window.addEventListener("pointercancel", onLeave, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stop();
      seen.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onLeave);
      window.removeEventListener("pointercancel", onLeave);
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hangers]);

  return (
    <div
      ref={boxRef}
      aria-hidden
      className="rail-fade pointer-events-none absolute inset-x-0 top-0 h-64 overflow-hidden sm:hidden"
    >
      {hangers.map((hanger, i) => (
        <div
          key={i}
          ref={(node) => {
            nodes.current[i] = node;
          }}
          className="rail-hang absolute top-0 -translate-x-1/2 opacity-30"
          style={{
            left: `${hanger.left.toFixed(2)}%`,
            width: `${hanger.width.toFixed(1)}px`,
            rotate: `${((hanger.angle * 180) / Math.PI).toFixed(2)}deg`,
          }}
        >
          {/* 화면 밖에서 옷까지 내려오는 고리 */}
          <div className="mx-auto w-px bg-ink/30" style={{ height: `${hanger.drop.toFixed(1)}px` }} />
          <ItemPhoto
            path={hanger.photoPath}
            alt=""
            category={hanger.category}
            className="aspect-[3/4] w-full rounded-[5px]"
            sizes="64px"
            compact
          />
        </div>
      ))}
    </div>
  );
}
