"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  clampPhoto,
  fitRect,
  minScale,
  moveCrop,
  ratioRect,
  resizeCrop,
  toCropView,
  HANDLES,
  type Handle,
  type Point,
  type Rect,
} from "@/lib/crop-box";
import { backdropColor, cropToJpeg, loadImage, readBackdrop } from "@/lib/image";

/** 사진 전체가 들어간 배율의 몇 배까지 키울 수 있나 */
const MAX_ZOOM = 6;

/** 자를 네모가 이보다 작아지면 손가락으로 잡을 수가 없다 (작업 칸 px) */
const MIN_CROP = 44;

type Props = {
  file: File;
  /** 처음에 잡아 줄 비율 (가로 / 세로). 바꿀 수 있다 */
  aspect: number;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
};

type RatioKey = "free" | "square" | "portrait" | "source";

const RATIOS: { key: RatioKey; label: string }[] = [
  { key: "free", label: "자유" },
  { key: "square", label: "1:1" },
  { key: "portrait", label: "3:4" },
  { key: "source", label: "원본" },
];

/** 사진 자리와 자를 네모. 둘을 한 덩어리로 들고 있어야 서로 어긋나지 않는다 */
type Layout = { scale: number; origin: Point; crop: Rect };

/**
 * 어느 사진·어느 칸 크기로 잡은 자리인지.
 *
 * 화면을 돌리거나 칸이 달라지면 들고 있던 좌표가 뜻을 잃는다. 그때는 들고 있는
 * 값을 버리고 처음 자리로 돌아간다 (`key` 가 다르면 못 쓰는 값이다).
 */
type Keyed = Layout & { key: string };

type Drag =
  | { kind: "photo"; last: Point }
  | { kind: "crop"; last: Point }
  | { kind: "handle"; handle: Handle };

/**
 * 올리기 전에 자르는 화면 (아이폰 사진 앱과 같은 방식).
 *
 * **자르기와 확대/축소가 따로 논다.**
 *   - 자를 네모는 모서리를 끌어 직접 정한다. 안쪽을 끌면 네모가 옮겨진다.
 *   - 사진은 네모 바깥을 끌거나, 두 손가락·휠·슬라이더로 따로 키운다.
 *
 * 예전에는 틀이 고정이라 사진을 끌고 키우는 것이 곧 자르기였다. 그래서 "가운데만
 * 쓰고 싶다" 같은 걸 하려면 사진을 키워서 틀에 밀어 넣는 수밖에 없었다.
 *
 * 규칙은 하나다 — **네모는 늘 사진 안에 있다** (lib/crop-box.ts). 그래서 잘라낸
 * 자리에 빈 곳이 안 생긴다.
 */
export function PhotoCropper({ file, aspect, onCancel, onDone }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const pinchDistance = useRef(0);
  const drag = useRef<Drag | null>(null);

  const [source, setSource] = useState<{ image: HTMLImageElement; url: string } | null>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [ratio, setRatio] = useState<RatioKey>(aspect === 1 ? "square" : "portrait");
  const [layout, setLayout] = useState<Keyed | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let created: string | null = null;

    loadImage(file)
      .then((loaded) => {
        created = loaded.url;
        if (cancelled) {
          URL.revokeObjectURL(loaded.url);
          return;
        }
        setSource(loaded);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "이미지를 읽지 못했습니다.");
      });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [file]);

  useLayoutEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setArea({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const image = source?.image ?? null;
  const natural = useMemo(
    () =>
      image
        ? { width: image.naturalWidth, height: image.naturalHeight }
        : { width: 0, height: 0 },
    [image],
  );

  /** 사진 전체가 작업 칸에 들어가는 배율 */
  const fitScale = useMemo(() => {
    if (!natural.width || !area.width) return 0;
    return fitRect(natural, area).width / natural.width;
  }, [natural, area]);

  const ratioValue = useCallback(
    (key: RatioKey): number | null => {
      if (key === "free") return null;
      if (key === "square") return 1;
      if (key === "portrait") return 3 / 4;
      return natural.height ? natural.width / natural.height : 1;
    },
    [natural],
  );

  /** 지금 사진·칸 크기를 가리키는 이름표 */
  const key = `${natural.width}x${natural.height}@${Math.round(area.width)}x${Math.round(area.height)}`;

  /**
   * 아직 손대지 않았을 때의 자리 — 사진 전체가 보이고, 그 안에 비율대로 네모.
   * 이펙트로 state 를 맞추면 첫 프레임이 어긋나므로 렌더 중에 구한다.
   */
  const initial = useMemo<Keyed | null>(() => {
    if (!natural.width || !area.width) return null;
    const photo = fitRect(natural, area);
    const value = ratioValue(ratio) ?? photo.width / photo.height;
    return {
      key,
      scale: photo.width / natural.width,
      origin: { x: photo.x, y: photo.y },
      crop: ratioRect(photo, value),
    };
    // ratio 는 처음 자리에만 쓰인다 (손댄 뒤에는 아래 current 가 이긴다)
  }, [natural, area, ratio, ratioValue, key]);

  const current = layout && layout.key === key ? layout : initial;

  /** 사진의 지금 자리 */
  const rectOf = useCallback(
    (base: Layout): Rect => ({
      x: base.origin.x,
      y: base.origin.y,
      width: natural.width * base.scale,
      height: natural.height * base.scale,
    }),
    [natural],
  );

  const photoRect = current ? rectOf(current) : null;

  /** 손댄 값은 늘 **지금 쓰이는 자리**에서 출발한다 */
  const update = useCallback(
    (change: (base: Layout) => Layout) => {
      setLayout((previous) => {
        const base = previous && previous.key === key ? previous : initial;
        if (!base) return previous;
        return { ...change(base), key };
      });
    },
    [initial, key],
  );

  /** 뒤에 깔 색. 누끼 사진의 투명한 자리가 저장 결과와 같아 보이도록 */
  const backdrop = useMemo(() => (image ? readBackdrop(image) : null), [image]);
  const sheet = backdrop ? backdropColor(backdrop, true) : undefined;

  /** 사진만 키운다. 네모는 안 건드린다 (그래서 자르기와 따로 논다) */
  const zoomTo = useCallback(
    (next: (from: number) => number, anchor: Point) => {
      update((base) => {
        if (!fitScale) return base;
        const low = minScale(natural, base.crop);
        const scale = Math.min(Math.max(next(base.scale), low), fitScale * MAX_ZOOM);
        const k = scale / base.scale;
        const moved = clampPhoto(
          {
            x: anchor.x - (anchor.x - base.origin.x) * k,
            y: anchor.y - (anchor.y - base.origin.y) * k,
            width: natural.width * scale,
            height: natural.height * scale,
          },
          base.crop,
        );
        return { ...base, scale, origin: { x: moved.x, y: moved.y } };
      });
    },
    [update, fitScale, natural],
  );

  /**
   * 휠 확대는 passive 가 아니어야 preventDefault 가 먹는다.
   * 리스너는 한 번만 달고, 안에서 쓸 함수는 ref 로 최신 것을 본다
   * (매 렌더 새로 다는 걸 막는다).
   */
  const zoomRef = useRef(zoomTo);
  useEffect(() => {
    zoomRef.current = zoomTo;
  });

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = element!.getBoundingClientRect();
      zoomRef.current((from) => from * (event.deltaY < 0 ? 1.12 : 1 / 1.12), {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    }
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, []);

  function localPoint(event: React.PointerEvent): Point {
    const rect = stageRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function pickRatio(next: RatioKey) {
    setRatio(next);
    update((base) => {
      const value = ratioValue(next);
      if (value === null) return base; // 자유: 지금 네모를 그대로 둔다
      const center = {
        x: base.crop.x + base.crop.width / 2,
        y: base.crop.y + base.crop.height / 2,
      };
      return { ...base, crop: ratioRect(rectOf(base), value, center) };
    });
  }

  function handlePointerDown(event: React.PointerEvent) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = localPoint(event);
    pointers.current.set(event.pointerId, point);

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDistance.current = Math.hypot(a.x - b.x, a.y - b.y);
      drag.current = null;
      return;
    }

    const handle = (event.target as HTMLElement).dataset?.handle as Handle | undefined;
    if (handle) {
      drag.current = { kind: "handle", handle };
      return;
    }

    const crop = current?.crop;
    const onCrop =
      crop &&
      point.x >= crop.x &&
      point.x <= crop.x + crop.width &&
      point.y >= crop.y &&
      point.y <= crop.y + crop.height;

    drag.current = { kind: onCrop ? "crop" : "photo", last: point };
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!pointers.current.has(event.pointerId)) return;
    const point = localPoint(event);
    pointers.current.set(event.pointerId, point);

    if (pointers.current.size >= 2) {
      // 두 손가락: 벌린 거리 비율로 사진만 키운다 (네모는 그대로)
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance.current > 0 && distance > 0) {
        const factor = distance / pinchDistance.current;
        zoomTo((from) => from * factor, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      }
      pinchDistance.current = distance;
      return;
    }

    const action = drag.current;
    if (!action) return;

    // 끄는 거리는 여기서 한 번만 센다 (update 가 두 번 불려도 두 배로 안 간다)
    let dx = 0;
    let dy = 0;
    if (action.kind !== "handle") {
      dx = point.x - action.last.x;
      dy = point.y - action.last.y;
      action.last = point;
    }

    update((base) => {
      const photo = rectOf(base);

      if (action.kind === "handle") {
        return {
          ...base,
          crop: resizeCrop(base.crop, action.handle, point, photo, ratioValue(ratio), MIN_CROP),
        };
      }

      if (action.kind === "crop") {
        return { ...base, crop: moveCrop(base.crop, dx, dy, photo) };
      }

      const moved = clampPhoto({ ...photo, x: photo.x + dx, y: photo.y + dy }, base.crop);
      return { ...base, origin: { x: moved.x, y: moved.y } };
    });
  }

  function handlePointerUp(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) drag.current = null;
    if (pointers.current.size < 2) pinchDistance.current = 0;
  }

  async function confirm() {
    if (!image || !current || !photoRect) return;
    setBusy(true);
    setError("");
    try {
      onDone(await cropToJpeg(image, toCropView(photoRect, current.crop, current.scale)));
    } catch (cause) {
      setBusy(false);
      setError(cause instanceof Error ? cause.message : "이미지 처리에 실패했습니다.");
    }
  }

  const crop = current?.crop ?? null;
  const low = current ? minScale(natural, current.crop) : 0;
  /** 잘라낸 결과가 몇 픽셀인지. 너무 작게 자르면 흐려지므로 같이 보여준다 */
  const output = current
    ? {
        width: Math.round(current.crop.width / current.scale),
        height: Math.round(current.crop.height / current.scale),
      }
    : null;

  return (
    <div>
      {/* 비율. `자유` 면 모서리가 제멋대로 늘어난다 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {RATIOS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            aria-pressed={ratio === entry.key}
            onClick={() => pickRatio(entry.key)}
            className={`chip ${ratio === entry.key ? "chip-active" : "bg-paper"}`}
          >
            {entry.label}
          </button>
        ))}
        {output ? (
          <span className="ml-auto text-xs text-muted">
            {output.width}×{output.height}
          </span>
        ) : null}
      </div>

      <div
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ aspectRatio: "1", touchAction: "none" }}
        className="relative w-full select-none overflow-hidden rounded-xl bg-[#171717]"
      >
        {source && photoRect ? (
          <>
            {/* 누끼 사진의 투명한 자리가 저장 결과와 같아 보이도록 깔아 둔다 */}
            <div
              className="absolute"
              style={{
                left: photoRect.x,
                top: photoRect.y,
                width: photoRect.width,
                height: photoRect.height,
                background: sheet,
              }}
            />
            {/* 크롭 대상 원본이라 next/image 가 아니라 <img> 를 쓴다 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={source.url}
              alt="자를 사진"
              draggable={false}
              style={{
                position: "absolute",
                left: photoRect.x,
                top: photoRect.y,
                width: photoRect.width,
                height: photoRect.height,
                maxWidth: "none",
              }}
            />
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-paper/70">
            불러오는 중…
          </div>
        )}

        {crop ? (
          <>
            {/* 바깥을 어둡게. 네모 하나에 아주 큰 그림자를 줘서 네 조각을 안 그린다 */}
            <div
              className="pointer-events-none absolute"
              style={{
                left: crop.x,
                top: crop.y,
                width: crop.width,
                height: crop.height,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              }}
            />
            {/* 테두리와 삼분할 안내선 */}
            <div
              className="pointer-events-none absolute grid grid-cols-3 grid-rows-3 border border-paper/90"
              style={{ left: crop.x, top: crop.y, width: crop.width, height: crop.height }}
            >
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={index} className="border border-paper/25" />
              ))}
            </div>

            {/* 모서리 손잡이. 손가락으로 잡히도록 보이는 것보다 넓게 둔다 */}
            {HANDLES.map((handle) => {
              const west = handle === "nw" || handle === "sw";
              const north = handle === "nw" || handle === "ne";
              return (
                <div
                  key={handle}
                  data-handle={handle}
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: (west ? crop.x : crop.x + crop.width) - 22,
                    top: (north ? crop.y : crop.y + crop.height) - 22,
                    width: 44,
                    height: 44,
                  }}
                  className="flex items-center justify-center"
                >
                  <span
                    data-handle={handle}
                    className="block h-4 w-4 rounded-sm border-2 border-paper bg-paper/20 shadow"
                  />
                </div>
              );
            })}
          </>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-xs text-muted">축소</span>
        <input
          type="range"
          min={low || 0.01}
          max={(fitScale || 0.01) * MAX_ZOOM}
          /* 눈금은 범위를 200칸으로 나눈다. 고정값으로 두면 사진마다 배율 폭이
             달라서, 어떤 사진에서는 키보드 화살표가 한참 눌러도 안 움직인다 */
          step={Math.max(((fitScale || 0.01) * MAX_ZOOM - (low || 0)) / 200, 0.0001)}
          value={current?.scale ?? 0.01}
          onChange={(event) => {
            const value = Number(event.target.value);
            const middle = crop
              ? { x: crop.x + crop.width / 2, y: crop.y + crop.height / 2 }
              : { x: area.width / 2, y: area.height / 2 };
            zoomTo(() => value, middle);
          }}
          aria-label="사진 확대 배율"
          className="h-1 flex-1 cursor-pointer accent-ink"
        />
        <span className="text-xs text-muted">확대</span>
      </div>

      <p className="mt-2 text-xs text-muted">
        모서리를 끌어 자를 범위를 정합니다. 네모 안을 끌면 범위가 옮겨지고, 바깥을 끌거나
        두 손가락·슬라이더를 쓰면 사진이 따로 움직입니다.
      </p>

      {error ? <p className="mt-2 text-sm text-accent">{error}</p> : null}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={confirm}
          disabled={busy || !current}
          className="btn-dark px-5 py-2 text-sm"
        >
          {busy ? "자르는 중…" : "이 범위로 자르기"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="text-sm text-muted underline underline-offset-4 hover:text-ink"
        >
          취소
        </button>
      </div>
    </div>
  );
}
