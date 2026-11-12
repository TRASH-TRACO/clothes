"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import {
  clampPlace,
  fitRect,
  fitScale,
  moveCrop,
  ratioRect,
  resizeCrop,
  sourceRect,
  HANDLES,
  type Handle,
  type Point,
  type Rect,
} from "@/lib/crop-box";
import { backdropColor, loadImage, placeToJpeg, readBackdrop } from "@/lib/image";

/**
 * 2단계에서 잘라낸 조각을 얼마나 줄이고 키울 수 있나.
 *
 * 1 이 "칸에 통째로 들어가는 크기" 다. 1 아래로 내려가면 사방에 여백이 생기고,
 * 위로 올라가면 칸 밖으로 넘친다 (넘친 자리는 잘린다).
 */
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 5;

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

/**
 * 2단계에서 잘라낸 조각이 놓인 자리.
 * `zoom` 은 "칸에 통째로 들어가는 크기" 의 몇 배인지다.
 */
type Place = { zoom: number; offset: Point };

type Drag =
  | { kind: "crop"; last: Point }
  | { kind: "handle"; handle: Handle }
  | { kind: "photo"; last: Point };

/**
 * 올리기 전에 자르는 화면. **두 단계다.**
 *
 *   1단계 자르기  — 사진 전체를 놓고, 그 위에서 네모의 모서리를 끌어 범위를 정한다.
 *   2단계 확대/축소 — 그 범위만 꽉 채워 놓고, 그 안에서 사진을 키우거나 옮긴다.
 *
 * 예전에는 틀이 고정이라 둘이 한 동작에 묶여 있었다. 무엇을 자를지 고르는 길이
 * 사진을 끌고 키우는 것뿐이어서, "가운데만 쓰고 싶다" 를 하려면 사진을 키워서 틀에
 * 밀어 넣어야 했다. 이제 **범위를 먼저 정하고, 그 다음에 배율을 본다.**
 *
 * 지켜야 할 것은 하나다 — 네모(또는 2단계의 틀)는 늘 사진 안에 있다
 * (lib/crop-box.ts). 그래야 잘라낸 자리에 빈 곳이 안 생긴다.
 */
export function PhotoCropper({ file, aspect, onCancel, onDone }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const pinchDistance = useRef(0);
  const drag = useRef<Drag | null>(null);

  const [source, setSource] = useState<{ image: HTMLImageElement; url: string } | null>(null);
  const [width, setWidth] = useState(0);
  const [step, setStep] = useState<0 | 1>(0);
  const [ratio, setRatio] = useState<RatioKey>(aspect === 1 ? "square" : "portrait");
  const [crop, setCrop] = useState<(Rect & { key: string }) | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
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

  // 자리 폭만 잰다. 칸 크기는 단계마다 아래에서 정한다
  useLayoutEffect(() => {
    const element = boxRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const image = source?.image ?? null;
  const natural = useMemo(
    () => (image ? { width: image.naturalWidth, height: image.naturalHeight } : { width: 0, height: 0 }),
    [image],
  );

  /** 1단계 칸은 정사각이다. 세로 사진도 가로 사진도 통째로 들어간다 */
  const area = useMemo(() => ({ width, height: width }), [width]);

  /** 1단계에 놓인 사진 자리 (사진 전체가 보이는 배율) */
  const photo0 = useMemo(() => fitRect(natural, area), [natural, area]);

  const ratioValue = useCallback(
    (key: RatioKey): number | null => {
      if (key === "free") return null;
      if (key === "square") return 1;
      if (key === "portrait") return 3 / 4;
      return natural.height ? natural.width / natural.height : 1;
    },
    [natural],
  );

  /** 사진·칸이 바뀌면 들고 있던 좌표는 뜻을 잃는다 */
  const key = `${natural.width}x${natural.height}@${Math.round(width)}`;

  /** 아직 손대지 않았을 때의 네모 — 사진 안에 비율대로 가장 크게 */
  const initialCrop = useMemo(() => {
    if (!photo0.width) return null;
    const value = ratioValue(ratio) ?? photo0.width / photo0.height;
    return { key, ...ratioRect(photo0, value) };
    // ratio 는 처음 네모에만 쓰인다 (손댄 뒤에는 아래 current 가 이긴다)
  }, [photo0, ratio, ratioValue, key]);

  const current = crop && crop.key === key ? crop : initialCrop;

  const updateCrop = useCallback(
    (change: (base: Rect) => Rect) => {
      setCrop((previous) => {
        const base = previous && previous.key === key ? previous : initialCrop;
        if (!base) return previous;
        return { key, ...change(base) };
      });
    },
    [initialCrop, key],
  );

  /**
   * 결과 칸. **1단계에서 뭘 자르든 이 크기는 안 바뀐다** — 부르는 쪽이 정한
   * 비율 그대로다 (옷은 정사각, 착장은 3:4). 2단계에서 움직이는 건 그 안에 놓인
   * 조각뿐이다.
   */
  const frame = useMemo(
    () => ({ width, height: width / aspect }),
    [width, aspect],
  );

  /** 1단계에서 고른 네모를 원본 픽셀 자리로 (2단계는 이 조각만 들고 간다) */
  const cut = useMemo<Rect | null>(() => {
    if (!current || !photo0.width) return null;
    return sourceRect(photo0, current, photo0.width / natural.width);
  }, [current, photo0, natural]);

  /** 조각이 결과 칸에 통째로 들어가는 배율 (zoom 1 이 이것이다) */
  const base = cut && frame.width ? fitScale(cut, frame) : 0;

  /** 조각이 칸 한가운데에 통째로 들어간 자리 — 아직 손대지 않았을 때 */
  const entry = useMemo<Place | null>(() => {
    if (!cut || !base) return null;
    return {
      zoom: 1,
      offset: {
        x: (frame.width - cut.width * base) / 2,
        y: (frame.height - cut.height * base) / 2,
      },
    };
  }, [cut, base, frame]);

  const view = step === 1 ? (place ?? entry) : null;

  /** 결과 칸 안에서 조각이 놓인 자리 */
  const dest = useMemo<Rect | null>(() => {
    if (!view || !cut || !base) return null;
    return {
      x: view.offset.x,
      y: view.offset.y,
      width: cut.width * base * view.zoom,
      height: cut.height * base * view.zoom,
    };
  }, [view, cut, base]);

  /** 1단계에 그릴 사진 자리 */
  const photoRect = photo0.width ? photo0 : null;

  /** 뒤에 깔 색. 여백과 누끼 사진의 투명한 자리가 저장 결과와 같아 보이도록 */
  const backdrop = useMemo(() => (image ? readBackdrop(image) : null), [image]);
  const sheet = backdrop ? backdropColor(backdrop, true) : undefined;
  const padding =
    backdrop && dest
      ? backdropColor(
          backdrop,
          dest.x <= 0.5 &&
            dest.y <= 0.5 &&
            dest.x + dest.width >= frame.width - 0.5 &&
            dest.y + dest.height >= frame.height - 0.5,
        )
      : undefined;

  /** 2단계에서 조각만 키우고 줄인다. 결과 칸은 그대로다 */
  const zoomTo = useCallback(
    (next: (from: number) => number, anchor: Point) => {
      if (!entry || !cut || !base) return;
      setPlace((previous) => {
        const from = previous ?? entry;
        const zoom = Math.min(Math.max(next(from.zoom), MIN_ZOOM), MAX_ZOOM);
        const k = zoom / from.zoom;
        const moved = clampPlace(
          {
            x: anchor.x - (anchor.x - from.offset.x) * k,
            y: anchor.y - (anchor.y - from.offset.y) * k,
            width: cut.width * base * zoom,
            height: cut.height * base * zoom,
          },
          frame,
        );
        return { zoom, offset: { x: moved.x, y: moved.y } };
      });
    },
    [entry, cut, base, frame],
  );

  /**
   * 휠 확대는 passive 가 아니어야 preventDefault 가 먹는다.
   * 리스너는 한 번만 달고, 안에서 쓸 함수는 ref 로 최신 것을 본다.
   */
  const wheel = useRef({ step, zoomTo });
  useEffect(() => {
    wheel.current = { step, zoomTo };
  });

  useEffect(() => {
    const element = stageRef.current;
    if (!element) return;
    function onWheel(event: WheelEvent) {
      if (wheel.current.step !== 1) return;
      event.preventDefault();
      const rect = element!.getBoundingClientRect();
      wheel.current.zoomTo((from) => from * (event.deltaY < 0 ? 1.12 : 1 / 1.12), {
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
    setPlace(null);
    updateCrop((box) => {
      const value = ratioValue(next);
      if (value === null) return box; // 자유: 지금 네모를 그대로 둔다
      const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      return ratioRect(photo0, value, center);
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

    if (step === 1) {
      drag.current = { kind: "photo", last: point };
      return;
    }

    const handle = (event.target as HTMLElement).dataset?.handle as Handle | undefined;
    if (handle) {
      drag.current = { kind: "handle", handle };
      return;
    }
    drag.current = { kind: "crop", last: point };
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!pointers.current.has(event.pointerId)) return;
    const point = localPoint(event);
    pointers.current.set(event.pointerId, point);

    if (pointers.current.size >= 2) {
      // 두 손가락 확대는 2단계에서만. 1단계에서 사진이 움직이면 자르기가 흔들린다
      if (step !== 1) return;
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDistance.current > 0 && distance > 0) {
        zoomTo((from) => from * (distance / pinchDistance.current), {
          x: (a.x + b.x) / 2,
          y: (a.y + b.y) / 2,
        });
      }
      pinchDistance.current = distance;
      return;
    }

    const action = drag.current;
    if (!action) return;

    if (action.kind === "handle") {
      updateCrop((base) =>
        resizeCrop(base, action.handle, point, photo0, ratioValue(ratio), MIN_CROP),
      );
      return;
    }

    // 끈 거리는 여기서 한 번만 센다 (상태 갱신이 두 번 불려도 두 배로 안 간다)
    const dx = point.x - action.last.x;
    const dy = point.y - action.last.y;
    action.last = point;

    if (action.kind === "crop") {
      updateCrop((base) => moveCrop(base, dx, dy, photo0));
      return;
    }

    if (!entry || !cut || !base) return;
    setPlace((previous) => {
      const from = previous ?? entry;
      const moved = clampPlace(
        {
          x: from.offset.x + dx,
          y: from.offset.y + dy,
          width: cut.width * base * from.zoom,
          height: cut.height * base * from.zoom,
        },
        frame,
      );
      return { zoom: from.zoom, offset: { x: moved.x, y: moved.y } };
    });
  }

  function handlePointerUp(event: React.PointerEvent) {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) drag.current = null;
    if (pointers.current.size < 2) pinchDistance.current = 0;
  }

  async function confirm() {
    if (!image || !cut || !dest) return;
    setBusy(true);
    setError("");
    try {
      onDone(await placeToJpeg(image, { source: cut, frame, dest }));
    } catch (cause) {
      setBusy(false);
      setError(cause instanceof Error ? cause.message : "이미지 처리에 실패했습니다.");
    }
  }

  /**
   * 지금 설정대로 저장하면 몇 픽셀인지.
   *
   * 1단계는 잘라낼 조각의 크기, 2단계는 **결과 칸** 의 크기다 (조각을 줄이면
   * 칸은 그대로인 채 여백이 늘어난다). 작게 자른 채로 크게 쓰면 흐려지는데
   * 누르기 전에는 알 길이 없다.
   */
  const output =
    step === 0
      ? cut
        ? { width: Math.round(cut.width), height: Math.round(cut.height) }
        : null
      : cut && dest
        ? {
            width: Math.round((frame.width * cut.width) / dest.width),
            height: Math.round((frame.height * cut.width) / dest.width),
          }
        : null;

  /** 지금 칸의 크기. 1단계는 정사각, 2단계는 결과 칸 그대로다 */
  const stage = step === 0 ? { width: area.width, height: area.height } : frame;

  return (
    <div>
      {/* 어느 단계인지 */}
      <div className="mb-3 flex items-center gap-2 text-xs">
        <span className={step === 0 ? "font-semibold text-ink" : "text-muted"}>1 자르기</span>
        <span className="text-line">→</span>
        <span className={step === 1 ? "font-semibold text-ink" : "text-muted"}>2 확대·축소</span>
        {output ? (
          <span className="ml-auto text-muted">
            {output.width}×{output.height}
          </span>
        ) : null}
      </div>

      {/* 비율은 1단계에서만 고른다 */}
      {step === 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {RATIOS.map((entryRatio) => (
            <button
              key={entryRatio.key}
              type="button"
              aria-pressed={ratio === entryRatio.key}
              onClick={() => pickRatio(entryRatio.key)}
              className={`chip ${ratio === entryRatio.key ? "chip-active" : "bg-paper"}`}
            >
              {entryRatio.label}
            </button>
          ))}
        </div>
      ) : null}

      <div ref={boxRef} className="w-full">
      <div
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          width: stage.width || "100%",
          height: stage.height,
          touchAction: "none",
          // 2단계 칸은 **저장될 여백 색** 그대로다. 1단계는 사진에 집중하도록 어둡게
          background: step === 1 ? padding : undefined,
        }}
        className={`relative mx-auto select-none overflow-hidden rounded-xl ${
          step === 1 ? "border border-line" : "bg-[#171717]"
        }`}
      >
        {!source ? (
          <div className="flex h-full items-center justify-center text-sm text-paper/70">
            불러오는 중…
          </div>
        ) : step === 0 && photoRect ? (
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
        ) : cut && dest ? (
          /* 2단계: 결과 칸에 **조각만** 놓는다. 남는 자리는 저장할 때와 같은 색이다.
             조각만 보이게 하려고 창(overflow-hidden) 안에서 사진을 밀어 놓는다 */
          <div
            className="absolute overflow-hidden"
            style={{
              left: dest.x,
              top: dest.y,
              width: dest.width,
              height: dest.height,
              /* 사진 바탕색과 여백 색이 같으면 조각이 어디까지인지 안 보인다.
                 고치는 동안만 보이는 선이고 저장에는 안 들어간다 */
              outline: "1px dashed rgba(17,17,17,0.25)",
              outlineOffset: -1,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={source.url}
              alt="자른 사진"
              draggable={false}
              style={{
                position: "absolute",
                left: -cut.x * (dest.width / cut.width),
                top: -cut.y * (dest.width / cut.width),
                width: natural.width * (dest.width / cut.width),
                height: natural.height * (dest.width / cut.width),
                maxWidth: "none",
              }}
            />
          </div>
        ) : null}

        {/* 1단계: 네모와 모서리 손잡이 */}
        {step === 0 && current ? (
          <>
            {/* 바깥을 어둡게. 네모 하나에 아주 큰 그림자를 줘서 네 조각을 안 그린다 */}
            <div
              className="pointer-events-none absolute"
              style={{
                left: current.x,
                top: current.y,
                width: current.width,
                height: current.height,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
              }}
            />
            <div
              className="pointer-events-none absolute grid grid-cols-3 grid-rows-3 border border-paper/90"
              style={{
                left: current.x,
                top: current.y,
                width: current.width,
                height: current.height,
              }}
            >
              {Array.from({ length: 9 }).map((_, index) => (
                <div key={index} className="border border-paper/25" />
              ))}
            </div>

            {/* 손가락으로 잡히도록 보이는 것보다 넓게 둔다 */}
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
                    left: (west ? current.x : current.x + current.width) - 22,
                    top: (north ? current.y : current.y + current.height) - 22,
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
      </div>

      {/* 슬라이더는 2단계에서만 */}
      {step === 1 && entry ? (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs text-muted">축소</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={(MAX_ZOOM - MIN_ZOOM) / 200}
            value={view?.zoom ?? 1}
            onChange={(event) => {
              const value = Number(event.target.value);
              zoomTo(() => value, { x: frame.width / 2, y: frame.height / 2 });
            }}
            aria-label="자른 사진 확대 배율"
            className="h-1 flex-1 cursor-pointer accent-ink"
          />
          <span className="text-xs text-muted">확대</span>
        </div>
      ) : null}

      <p className="mt-2 text-xs text-muted">
        {step === 0
          ? "모서리를 끌어 자를 범위를 정합니다. 네모 안을 끌면 범위가 옮겨집니다."
          : "잘라낸 사진을 끌어 옮기고, 두 손가락·휠·슬라이더로 키우거나 줄입니다. 칸 크기는 그대로입니다."}
      </p>

      {error ? <p className="mt-2 text-sm text-accent">{error}</p> : null}

      <div className="mt-3 flex items-center gap-3">
        {step === 0 ? (
          <>
            <button
              type="button"
              onClick={() => {
                setPlace(null);
                setStep(1);
              }}
              disabled={!current}
              className="btn-dark px-5 py-2 text-sm"
            >
              다음
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="text-sm text-muted underline underline-offset-4 hover:text-ink"
            >
              취소
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={confirm}
              disabled={busy || !view}
              className="btn-dark px-5 py-2 text-sm"
            >
              {busy ? "자르는 중…" : "이 사진으로"}
            </button>
            <button
              type="button"
              onClick={() => setStep(0)}
              disabled={busy}
              className="text-sm text-muted underline underline-offset-4 hover:text-ink"
            >
              ← 범위 다시
            </button>
          </>
        )}
      </div>
    </div>
  );
}
