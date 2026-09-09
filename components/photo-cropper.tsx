"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { cropToJpeg, loadImage } from "@/lib/image";

const MAX_ZOOM = 4;

type Props = {
  file: File;
  /** 잘라낼 비율 (가로 / 세로) */
  aspect: number;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
};

type Point = { x: number; y: number };
type View = { zoom: number; offset: Point };

/**
 * 업로드 전에 보여질 칸에 맞춰 사진을 자른다.
 *
 * 좌표계: offset은 프레임 좌상단을 기준으로 한 이미지 좌상단의 위치(CSS px).
 * baseScale은 zoom=1일 때 이미지가 프레임을 꽉 채우는 배율이라
 * 확대만 가능하고 빈 공간이 생길 수 없다.
 *
 * view는 사용자가 건드리기 전까지 null이고, 그동안은 '가운데 꽉 채움'을
 * 렌더 중에 계산해서 쓴다. (이펙트로 상태를 맞추면 첫 프레임이 어긋난다)
 */
export function PhotoCropper({ file, aspect, onCancel, onDone }: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const pinchDistance = useRef(0);

  const [source, setSource] = useState<{
    image: HTMLImageElement;
    url: string;
  } | null>(null);
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<View | null>(null);
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
        setError(
          cause instanceof Error ? cause.message : "이미지를 읽지 못했습니다.",
        );
      });

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [file]);

  useLayoutEffect(() => {
    const element = frameRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setFrame({ width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const image = source?.image ?? null;
  // zoom 1 = 프레임을 꽉 채우는 배율(cover). 그 아래로는 원본 전체가
  // 들어가는 배율(contain)까지 내려갈 수 있고, 남는 여백은 블러로 채운다.
  const baseScale =
    image && frame.width
      ? Math.max(
          frame.width / image.naturalWidth,
          frame.height / image.naturalHeight,
        )
      : 0;
  const containScale =
    image && frame.width
      ? Math.min(
          frame.width / image.naturalWidth,
          frame.height / image.naturalHeight,
        )
      : 0;
  const minZoom = baseScale ? containScale / baseScale : 1;

  /**
   * 사용자가 아직 조작하지 않았을 때의 기본값 — 가운데 꽉 채움.
   * 매 렌더 새 객체가 되면 아래 useCallback들이 무의미해지고
   * 휠 리스너가 계속 재부착되므로 memo로 고정한다.
   */
  const fitted = useMemo<View | null>(
    () =>
      image && baseScale
        ? {
            zoom: 1,
            offset: {
              x: (frame.width - image.naturalWidth * baseScale) / 2,
              y: (frame.height - image.naturalHeight * baseScale) / 2,
            },
          }
        : null,
    [image, baseScale, frame.width, frame.height],
  );

  const current = view ?? fitted;

  const clampOffset = useCallback(
    (next: Point, scale: number): Point => {
      if (!image) return next;
      // 이미지가 프레임보다 크면 빈 곳이 보이지 않게 가두고, 축소해서
      // 작아지면 프레임 밖으로 못 나가게 가둔다. 여백 부호로 두 경우가 갈린다.
      const slackX = frame.width - image.naturalWidth * scale;
      const slackY = frame.height - image.naturalHeight * scale;
      return {
        x: Math.min(Math.max(next.x, Math.min(0, slackX)), Math.max(0, slackX)),
        y: Math.min(Math.max(next.y, Math.min(0, slackY)), Math.max(0, slackY)),
      };
    },
    [image, frame.width, frame.height],
  );

  /** anchor(프레임 좌표)를 고정한 채 배율을 바꾼다 */
  const applyZoom = useCallback(
    (nextZoom: (from: number) => number, anchor: Point) => {
      setView((previous) => {
        const base = previous ?? fitted;
        if (!base || !baseScale) return previous;

        const target = Math.min(
          MAX_ZOOM,
          Math.max(minZoom, nextZoom(base.zoom)),
        );
        const ratio = target / base.zoom;
        return {
          zoom: target,
          offset: clampOffset(
            {
              x: anchor.x - (anchor.x - base.offset.x) * ratio,
              y: anchor.y - (anchor.y - base.offset.y) * ratio,
            },
            baseScale * target,
          ),
        };
      });
    },
    [fitted, baseScale, minZoom, clampOffset],
  );

  const pan = useCallback(
    (dx: number, dy: number) => {
      setView((previous) => {
        const base = previous ?? fitted;
        if (!base || !baseScale) return previous;
        return {
          zoom: base.zoom,
          offset: clampOffset(
            { x: base.offset.x + dx, y: base.offset.y + dy },
            baseScale * base.zoom,
          ),
        };
      });
    },
    [fitted, baseScale, clampOffset],
  );

  // 휠 확대는 passive가 아니어야 preventDefault가 먹는다
  useEffect(() => {
    const element = frameRef.current;
    if (!element) return;

    function onWheel(event: WheelEvent) {
      event.preventDefault();
      const rect = element!.getBoundingClientRect();
      applyZoom((from) => from * (event.deltaY < 0 ? 1.12 : 1 / 1.12), {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      });
    }

    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [applyZoom]);

  function localPoint(event: React.PointerEvent): Point {
    const rect = frameRef.current!.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handlePointerDown(event: React.PointerEvent) {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, localPoint(event));
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchDistance.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!pointers.current.has(event.pointerId)) return;
    const previous = pointers.current.get(event.pointerId)!;
    const point = localPoint(event);
    pointers.current.set(event.pointerId, point);

    if (pointers.current.size >= 2) {
      // 두 손가락: 벌린 거리 비율로 확대하고, 중점을 고정점으로 삼는다
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance.current > 0 && distance > 0) {
        const factor = distance / pinchDistance.current;
        applyZoom((from) => from * factor, {
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
        });
      }
      pinchDistance.current = distance;
      return;
    }

    pan(point.x - previous.x, point.y - previous.y);
  }

  function handlePointerUp(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchDistance.current = 0;
  }

  async function confirm() {
    if (!image || !baseScale || !current) return;
    setBusy(true);
    setError("");
    try {
      onDone(
        await cropToJpeg(image, {
          frame,
          offset: current.offset,
          scale: baseScale * current.zoom,
        }),
      );
    } catch (cause) {
      setBusy(false);
      setError(
        cause instanceof Error ? cause.message : "이미지 처리에 실패했습니다.",
      );
    }
  }

  const scale = baseScale * (current?.zoom ?? 1);

  return (
    <div>
      <div
        ref={frameRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ aspectRatio: String(aspect), touchAction: "none" }}
        className="relative w-full cursor-grab overflow-hidden rounded-xl bg-mist active:cursor-grabbing"
      >
        {/* 여백을 채울 블러 배경. 저장 결과와 같은 그림이 되도록 미리 깔아둔다 */}
        {source ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={source.url}
            alt=""
            aria-hidden
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            style={{ filter: "blur(24px)", transform: "scale(1.15)" }}
          />
        ) : null}

        {source && current ? (
          /* 크롭 대상 원본이라 next/image가 아니라 <img>를 쓴다 */
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={source.url}
            alt="자를 사진"
            draggable={false}
            style={{
              position: "absolute",
              left: current.offset.x,
              top: current.offset.y,
              width: source.image.naturalWidth * scale,
              height: source.image.naturalHeight * scale,
              maxWidth: "none",
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-paper/70">
            불러오는 중…
          </div>
        )}

        {/* 삼분할 안내선 */}
        <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <div key={index} className="border border-paper/20" />
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span className="text-xs text-muted">축소</span>
        <input
          type="range"
          min={minZoom}
          max={MAX_ZOOM}
          step={0.01}
          value={current?.zoom ?? 1}
          onChange={(event) => {
            const value = Number(event.target.value);
            applyZoom(() => value, { x: frame.width / 2, y: frame.height / 2 });
          }}
          aria-label="확대 배율"
          className="h-1 flex-1 cursor-pointer accent-ink"
        />
        <span className="text-xs text-muted">확대</span>
      </div>

      <p className="mt-2 text-xs text-muted">
        드래그로 위치를 옮기고, 휠·두 손가락·슬라이더로 확대합니다.
      </p>

      {error ? <p className="mt-2 text-sm text-accent">{error}</p> : null}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={confirm}
          disabled={busy || !source}
          className="btn-dark px-5 py-2 text-sm"
        >
          {busy ? "자르는 중…" : "이 영역으로 자르기"}
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
