"use client";

import { useEffect, useRef } from "react";

import { ItemPhoto } from "@/components/item-photo";
import type { Category } from "@/lib/categories";
import { angleAt, offsetX, offsetY, pull, release, step, type Shape, type Swing } from "@/lib/pendulum";

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

/** 손가락 굵기 (반지름, px). 여기에 옷 반너비를 더한 만큼 안에 있으면 잡힌다 */
const FINGER = 22;

/**
 * 세로로 얼마나 어긋나도 잡히는지 (px).
 *
 * 옷이 화면 위쪽 작은 영역에만 걸려 있어서, 딱 맞춰 대야만 잡히면 안 잡히는 줄 안다.
 */
const SLACK = 44;

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
 * 봉에 걸린 옷을 손으로 당겼다 놓는다.
 *
 * 누르면 그 자리에 있는 옷 **한 벌**을 잡는다. 끄는 동안 옷은 손을 그대로 따라오고
 * (중력은 손이 이기고 있으니 일하지 않는다), 손을 놓으면 그때부터 진자로 돈다.
 *
 * **당긴 데보다 높이 올라가지 않는다.** 놓을 때 속도를 에너지로 재서 깎기 때문이다
 * (lib/pendulum.ts 의 release). 끝까지 끌고 가서 놓으면 그 자리에서 조용히 떨어지고,
 * 오다가 도중에 놓아도 당겨 둔 데까지만 올라간다.
 *
 * 옷마다 길이가 달라 (걸린 자리에서 옷 한가운데까지) 되돌아오는 속도가 다르다.
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

    let handX = 0;
    /** 지금 잡고 있는 옷. −1 이면 아무것도 안 잡았다 */
    let held = -1;
    /** 끌고 다니는 동안 가 본 가장 먼 각도. 놓을 때 여기까지만 올라가게 한다 */
    let peak = 0;

    function onDown(event: PointerEvent) {
      handX = event.clientX;
      // 손가락에 제일 가까운 옷 한 벌만 잡는다. 여럿을 한꺼번에 끄는 손은 없다.
      let best = -1;
      let nearest = Infinity;
      for (let i = 0; i < hangers.length; i += 1) {
        const hanger = hangers[i];
        const bobX = pivots[i].x + offsetX(swings[i], hanger.shape);
        const bobY = pivots[i].y + offsetY(swings[i], hanger.shape);
        const away = Math.abs(bobX - event.clientX);
        if (away > FINGER + hanger.width / 2 || away >= nearest) continue;
        if (Math.abs(event.clientY - bobY) > (hanger.width * 4) / 3 / 2 + SLACK) continue;
        nearest = away;
        best = i;
      }
      held = best;
      peak = best < 0 ? 0 : Math.abs(swings[best].angle);
    }

    function onMove(event: PointerEvent) {
      handX = event.clientX;
    }

    function onUp() {
      if (held >= 0) {
        // 놓는 순간 당긴 데까지만 올라가도록 속도를 깎는다
        swings[held] = release(swings[held], hangers[held].shape, peak);
      }
      held = -1;
    }

    let raf = 0;
    let last = performance.now();

    function frame(now: number) {
      const dt = Math.min((now - last) / 1000, MAX_FRAME);
      last = now;

      const clock = now / 1000;

      for (let i = 0; i < hangers.length; i += 1) {
        const hanger = hangers[i];
        const state = swings[i];

        if (i === held) {
          // 잡고 있는 동안은 손이 가는 자리로 따라간다
          swings[i] = pull(state, angleAt(hanger.shape, handX - pivots[i].x), dt);
          peak = Math.max(peak, Math.abs(swings[i].angle));
        } else {
          // 놓여난 뒤에는 스스로 흔들린다. 산들바람은 죽은 듯 서 있지 않게 하는 정도.
          const breeze =
            BREEZE * Math.sin(clock * 0.63 + hanger.phase) +
            BREEZE * 0.6 * Math.sin(clock * 1.07 + hanger.phase * 1.7);
          swings[i] = step(state, hanger.shape, breeze, dt);
        }

        const node = nodes.current[i];
        if (!node) continue;
        // rotate 는 transform 과 따로 쌓인다. Tailwind 의 -translate-x-1/2 를 안 지운다.
        node.style.rotate = `${((swings[i].angle * 180) / Math.PI).toFixed(2)}deg`;
        // 뭘 잡았는지 보여야 끌고 있다는 걸 안다
        node.style.opacity = i === held ? "0.55" : "";
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

    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", onUp, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("scroll", measure, { passive: true });
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stop();
      seen.disconnect();
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
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
