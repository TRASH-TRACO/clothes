"use client";

import { useEffect, useRef } from "react";

import { ItemPhoto } from "@/components/item-photo";
import type { Category } from "@/lib/categories";
import { offsetX, offsetY, shove, step, type Shape, type Swing } from "@/lib/pendulum";

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

/** 손가락 굵기 (반지름, px). 여기에 옷 반너비를 더한 만큼이 닿는 범위다 */
const FINGER = 14;

/**
 * 세로로 얼마나 어긋나도 닿은 것으로 볼지 (px).
 *
 * 옷이 화면 위쪽 작은 영역에만 걸려 있어서, 딱 맞춰 대야만 반응하면 안 움직이는
 * 줄 안다. 조금 여유를 준다.
 */
const SLACK = 40;

/**
 * 이만큼 손이 멈춰 있으면 뗀 것으로 본다 (초).
 *
 * 폰은 손을 떼면 pointerup 이 오지만 마우스는 안 온다. 안 그러면 커서를 옷 위에
 * 둔 채 다른 일을 하는 동안 옷이 붙잡힌 채로 남는다.
 */
const LET_GO = 0.25;

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
 * 봉에 걸린 옷을 손으로 직접 밀친다.
 *
 * 손은 바람이 아니라 **물건**이다. 옷걸이 사이로 손을 훑으면 닿은 옷이 손 앞으로
 * 치워졌다가, 손이 지나가면 그 속도를 들고 놓여나 크게 흔들린다.
 * 닿지 않은 옷은 건드리지 않는다 — 그래야 손이 어디를 지나갔는지가 보인다.
 *
 * 옷마다 진자로 풀어서 (lib/pendulum.ts) 길게 걸린 옷은 느리게, 짧게 걸린 옷은
 * 빠르게 되돌아온다.
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
    /** 각 옷이 걸린 자리 (px, 화면 기준). 손과 부딪히는지 보려면 필요하다 */
    let pivots: { x: number; y: number }[] = [];

    function measure() {
      const rect = box!.getBoundingClientRect();
      pivots = hangers.map((hanger) => ({
        x: rect.left + (rect.width * hanger.left) / 100,
        y: rect.top,
      }));
    }
    measure();

    /** 손가락. touching 이 false 면 화면에 없는 것으로 친다 */
    let handX = 0;
    let handY = 0;
    let handSpeed = 0;
    let touching = false;
    let idle = 0;
    let lastX: number | null = null;
    let lastAt = 0;

    function onMove(event: PointerEvent) {
      const now = event.timeStamp;
      if (lastX !== null && now > lastAt) {
        handSpeed = ((event.clientX - lastX) / (now - lastAt)) * 1000;
      }
      handX = event.clientX;
      handY = event.clientY;
      lastX = event.clientX;
      lastAt = now;
      touching = true;
      idle = 0;
    }

    function onLeave() {
      touching = false;
      handSpeed = 0;
      lastX = null;
    }

    let raf = 0;
    let last = performance.now();

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, MAX_FRAME);
      last = now;

      // 손이 멈춰 있으면 뗀 것으로 본다 (마우스는 뗀다는 신호가 없다)
      idle += dt;
      if (idle > LET_GO) {
        touching = false;
        handSpeed = 0;
      }
      const clock = now / 1000;

      for (let i = 0; i < hangers.length; i += 1) {
        const hanger = hangers[i];
        const state = swings[i];
        const pivot = pivots[i];
        // 옷 한가운데가 지금 어디에 있는지. 밀렸으면 그만큼 옆으로 가 있다.
        const bobX = pivot.x + offsetX(state, hanger.shape);
        const bobY = pivot.y + offsetY(state, hanger.shape);

        const reach = FINGER + hanger.width / 2;
        const gap = bobX - handX;
        const hit =
          touching &&
          Math.abs(gap) < reach &&
          Math.abs(handY - bobY) < (hanger.width * 4) / 3 / 2 + SLACK;

        if (hit) {
          swings[i] = shove(state, hanger.shape, gap, reach, handSpeed);
        } else {
          // 손이 안 닿을 때는 스스로 흔들린다. 산들바람은 죽은 듯 서 있지 않게 하는 정도.
          const breeze =
            BREEZE * Math.sin(clock * 0.63 + hanger.phase) +
            BREEZE * 0.6 * Math.sin(clock * 1.07 + hanger.phase * 1.7);
          swings[i] = step(state, hanger.shape, breeze, dt);
        }

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
    window.addEventListener("pointerleave", onLeave, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("scroll", measure, { passive: true });
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stop();
      seen.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onLeave);
      window.removeEventListener("pointercancel", onLeave);
      window.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
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
