"use client";

import { WarmLink } from "@/components/warm-link";
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { FeltGlyph } from "@/components/feedback-glyph";
import { ItemPhoto } from "@/components/item-photo";
import { OutfitPhoto } from "@/components/outfit-photo";
import { WearForm } from "@/components/wear-form";
import { saveWearLog } from "@/app/actions/wear";
import { findSimilarDay, type SimilarDay } from "@/app/actions/similar";
import { CATEGORY_META } from "@/lib/categories";
import { dayLabel, seoulToday } from "@/lib/calendar";
import { FELT_LABELS } from "@/lib/feedback";
import { isPlace, placeKey, roundPlace, type Place } from "@/lib/places";
import type { WearLogWithItems } from "@/lib/types";
import { weatherKind, weatherLabel, type RecordedDay } from "@/lib/weather-codes";
import { WeatherGlyph } from "@/components/weather-glyph";

type Props = {
  date: string;
  log: WearLogWithItems | null;
  day: RecordedDay | null;
  basePlace: Place;
  /** 바로 수정 화면으로 열지 */
  startInEdit?: boolean;
  onClose: () => void;
};

/**
 * 패널 높이. 화면 높이에 대한 비율이고, **내용과 상관없이 늘 같다.**
 *
 * 내용에 맞춰 높이가 달라지면 날짜마다 패널이 널뛴다 (옷 열 벌 적은 날과
 * 아무것도 없는 날). 자리를 고정해 두면 어느 날을 눌러도 같은 자리에서 시작한다.
 */
const COLLAPSED = 0.52;
/** 위로 쓸어올렸을 때 */
const EXPANDED = 0.92;
/** 이만큼(px)은 끌어야 단계가 바뀐다. 손가락이 살짝 흔들린 것까지 먹지 않게 */
const SNAP = 48;

function logPlaceOf(log: WearLogWithItems | null): Place | null {
  if (!log) return null;
  const place = { name: log.place_name, lat: log.place_lat, lon: log.place_lon };
  return isPlace(place) ? roundPlace(place) : null;
}

/**
 * 달력 위에 뜨는 그날 화면.
 *
 * 달력이 이미 그 달의 기록과 날씨를 들고 있고 옷·코디 목록은 레이아웃에 있으므로,
 * 날짜를 눌러도 서버를 부르지 않는다.
 */
export function DayPanel({ date, log, day, basePlace, startInEdit = false, onClose }: Props) {
  const [editing, setEditing] = useState(startInEdit || !log);
  const pinned = logPlaceOf(log);
  const today = seoulToday();

  /**
   * 이 날씨와 비슷했던 날.
   *
   * 이미 옷을 적어 둔 날에는 안 찾는다 — 권할 이유가 없고, 날짜를 누를 때마다
   * 서버를 부를 이유는 더 없다.
   */
  const [similar, setSimilar] = useState<SimilarDay | null>(null);
  const empty = !log || log.items.length === 0;
  const canAsk = editing && empty && day !== null && day.high !== null && day.low !== null;

  useEffect(() => {
    if (!canAsk || !day || day.high === null || day.low === null) return;
    let alive = true;
    findSimilarDay(date, day.high, day.low, day.code)
      .then((found) => {
        if (alive) setSimilar(found);
      })
      .catch(() => {
        /* 추천은 곁다리다. 못 받아도 기록은 그대로 적는다 */
      });
    return () => {
      alive = false;
    };
  }, [canAsk, date, day]);

  /**
   * 위로 쓸어올리면 커진다 (모바일).
   *
   * 끄는 동안에는 손가락을 그대로 따라가도록 px 로 직접 잡고, 손을 떼면 다시
   * 두 단계(반 화면 / 거의 전체) 중 하나로 붙는다. 접힌 상태에서 아래로 쓸면 닫힌다.
   *
   * **끄는 동안에는 리액트를 안 거친다.** 높이를 state 로 들고 있으면 손가락이 한 번
   * 움직일 때마다 이 패널이 통째로 다시 그려지는데, 그 안에는 옷장 전체 격자가 들어
   * 있다. 재 보니 옷 80벌에서 손가락 한 번에 70~95ms 짜리 작업이 하나씩 걸렸다
   * (덜컥거림의 전부다). 같은 옷 수로 DOM 에 직접 쓰면 긴 작업이 0개다. 그래서
   * 끄는 동안은 ref 로 들고 sheet.style.height 에 바로 쓰고, **손을 뗄 때 한 번만**
   * state 를 건드린다.
   */
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ y: number; height: number; live: number } | null>(null);
  /** 그리기를 기다리는 rAF. 손가락은 초당 120번 읽히므로 한 프레임에 한 번만 쓴다 */
  const paintRef = useRef(0);
  const [expanded, setExpanded] = useState(false);

  /** 화면을 다시 그릴 때가 되면 그때의 높이 하나만 쓴다 */
  function paint() {
    paintRef.current = 0;
    const drag = dragRef.current;
    const sheet = sheetRef.current;
    if (!drag || !sheet) return;
    sheet.style.height = `${drag.live}px`;
  }

  function onGrabStart(event: ReactPointerEvent<HTMLElement>) {
    const sheet = sheetRef.current;
    if (!sheet) return;
    // 머리글에는 닫기 버튼도 있다. 버튼을 누른 손가락까지 붙잡으면 눌리지 않는다
    if ((event.target as HTMLElement).closest("button,a")) return;
    const height = sheet.getBoundingClientRect().height;
    dragRef.current = { y: event.clientY, height, live: height };
    // 끄는 동안 0.2초짜리 애니메이션이 걸려 있으면 손가락보다 늦게 따라온다
    sheet.style.transitionProperty = "none";
    sheet.style.height = `${height}px`;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onGrabMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    const view = window.innerHeight;
    const wanted = drag.height - (event.clientY - drag.y);
    // 닫는 손짓이 손가락을 따라가 보이도록 접힌 높이보다 조금 더 내려갈 수 있게 둔다
    const floor = view * COLLAPSED - SNAP * 2;
    drag.live = Math.max(floor, Math.min(view * EXPANDED, wanted));
    if (!paintRef.current) paintRef.current = requestAnimationFrame(paint);
  }

  function onGrabEnd(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    if (paintRef.current) {
      cancelAnimationFrame(paintRef.current);
      paintRef.current = 0;
    }

    // 손으로 잡아 둔 px 을 놓아주면 아래 class 의 높이로 돌아가고, 애니메이션을
    // 같이 살리므로 지금 있던 자리에서 부드럽게 붙는다
    const sheet = sheetRef.current;
    if (sheet) {
      sheet.style.height = "";
      sheet.style.transitionProperty = "";
    }

    const up = drag.y - event.clientY;
    if (up > SNAP) setExpanded(true);
    else if (up < -SNAP) {
      if (expanded) setExpanded(false);
      else onClose();
    }
  }

  /** memo 로 막아 둔 속(PanelBody)이 이것 때문에 다시 그려지면 안 된다 */
  const startEditing = useCallback(() => setEditing(true), []);

  // 끌다가 화면이 닫히면 예약해 둔 그리기를 치운다
  useEffect(() => () => {
    if (paintRef.current) cancelAnimationFrame(paintRef.current);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    // 패널 뒤 달력이 같이 스크롤되지 않게
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={dayLabel(date)}
        className={`relative flex w-full flex-col overflow-hidden rounded-t-2xl bg-paper
          transition-[height] duration-200 ease-out sm:h-[80dvh] sm:max-w-3xl sm:rounded-2xl ${
            expanded ? "h-[92dvh]" : "h-[52dvh]"
          }`}
      >
        {/* 쓸어올리는 손잡이. 마우스로는 눌러서 끌거나 그냥 눌러도 단계가 바뀐다 */}
        <div
          role="button"
          tabIndex={0}
          aria-label={expanded ? "패널 줄이기" : "패널 키우기"}
          aria-expanded={expanded}
          onPointerDown={onGrabStart}
          onPointerMove={onGrabMove}
          onPointerUp={onGrabEnd}
          onPointerCancel={onGrabEnd}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setExpanded((was) => !was);
            }
          }}
          className="flex shrink-0 touch-none cursor-grab justify-center pt-2 pb-1 sm:hidden"
        >
          <span className="h-1 w-10 rounded-full bg-line" />
        </div>

        {/* 머리글을 잡고 끌어도 된다. touch-none 이라야 한다 — 세로 끌기를 브라우저에도
            넘기면(touch-pan-y) iOS 의 고무줄 스크롤과 서로 당겨 툭툭 끊긴다 */}
        <div
          onPointerDown={onGrabStart}
          onPointerMove={onGrabMove}
          onPointerUp={onGrabEnd}
          onPointerCancel={onGrabEnd}
          className="flex shrink-0 touch-none items-start justify-between gap-4 border-b
            border-line px-6 pt-4 pb-5 sm:pt-6"
        >
          <div>
            <p className="eyebrow">{date === today ? "오늘" : date > today ? "예정" : "기록"}</p>
            <h2 className="display mt-2 text-3xl sm:text-4xl">{dayLabel(date)}</h2>
            {day ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                <WeatherGlyph kind={weatherKind(day.code)} className="h-4 w-4 shrink-0" />
                {day.high === null ? "―" : `${Math.round(day.high)}°`}
                {day.low === null ? "" : ` / ${Math.round(day.low)}°`} · {weatherLabel(day.code)} ·{" "}
                {day.place.name}
                {/* 적어 둔 지역이 지금 기본 지역과 다를 수 있다 (기록은 그때 지역으로 굳는다).
                    지금 기본 지역을 그대로 붙이면 거짓말이 되므로 나눠서 적는다 */}
                {pinned
                  ? ""
                  : placeKey(day.place) === placeKey(basePlace)
                    ? " (기본)"
                    : " (기록)"}
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted">이 날짜의 날씨는 남아 있지 않습니다.</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="-mr-2 -mt-2 shrink-0 rounded-full p-2 text-muted hover:text-ink"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-8">
          <PanelBody
            editing={editing}
            date={date}
            log={log}
            basePlace={basePlace}
            pinned={pinned}
            similar={similar}
            onEdit={startEditing}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * 패널의 속. **접고 펴는 것과 따로 둔다.**
 *
 * 높이만 바뀌는데 옷장 전체 격자까지 다시 그릴 이유가 없다. 재 보니 옷 80벌에서
 * 한 번 그리는 데 100ms 가 걸려서, 손을 떼고 붙는 0.2초 애니메이션의 절반을 먹었다.
 * memo 로 막아 두면 접고 펼 때 이 안은 건드리지 않는다.
 */
const PanelBody = memo(function PanelBody({
  editing,
  date,
  log,
  basePlace,
  pinned,
  similar,
  onEdit,
  onClose,
}: {
  editing: boolean;
  date: string;
  log: WearLogWithItems | null;
  basePlace: Place;
  pinned: Place | null;
  similar: SimilarDay | null;
  onEdit: () => void;
  onClose: () => void;
}) {
  if (!editing && log) return <DayView log={log} onEdit={onEdit} onClose={onClose} />;
  return (
    <WearForm
      date={date}
      log={log}
      basePlace={basePlace}
      place={pinned}
      action={saveWearLog}
      onCancel={onClose}
      similar={similar}
    />
  );
});

function DayView({
  log,
  onEdit,
  onClose,
}: {
  log: WearLogWithItems;
  onEdit: () => void;
  onClose: () => void;
}) {
  // 코디는 자리당 한 벌이라, 같은 분류가 여럿이면 앞의 것만 들고 간다
  // (log.items 는 분류 순서대로 서 있다). 두 벌 아래면 코디가 안 되므로 안 보인다.
  const studioHref = (() => {
    if (log.items.length < 2) return null;
    const params = new URLSearchParams();
    for (const item of log.items) {
      if (!params.has(item.category)) params.set(item.category, item.id);
    }
    return `/studio?${params.toString()}`;
  })();

  return (
    <div className="pt-6">
      {log.felt ? (
        <p className="inline-flex items-center gap-2 rounded-full bg-mist px-4 py-2 text-sm font-medium">
          <FeltGlyph value={log.felt} className="text-lg" />
          {FELT_LABELS[log.felt]}
        </p>
      ) : null}

      {log.outfit ? (
        <p className="mt-5 text-sm text-muted">
          저장한 코디{" "}
          <WarmLink
            href={`/outfits/${log.outfit.id}`}
            className="font-semibold text-ink underline underline-offset-4"
          >
            {log.outfit.title}
          </WarmLink>
        </p>
      ) : null}

      {log.outfit?.photo_path ? (
        <OutfitPhoto
          path={log.outfit.photo_path}
          alt={`${log.outfit.title} 착장 사진`}
          className="mt-5 aspect-square max-w-xs rounded-xl"
          sizes="320px"
        />
      ) : null}

      <h3 className="display mt-8 text-xl">입은 옷 {log.items.length}개</h3>
      {log.items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">옷은 남기지 않고 지역만 기록한 날입니다.</p>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-5">
          {log.items.map((item) => (
            <WarmLink key={item.id} href={`/closet/${item.id}`} className="group">
              <ItemPhoto
                path={item.photo_path}
                alt={item.name}
                category={item.category}
                className="aspect-square rounded-xl"
                sizes="140px"
                compact
              />
              <p className="mt-2 truncate text-xs font-semibold group-hover:underline">
                {item.name}
              </p>
              <p className="truncate text-xs text-muted">{CATEGORY_META[item.category].label}</p>
            </WarmLink>
          ))}
        </div>
      )}

      {log.memo ? (
        <>
          <h3 className="display mt-8 text-xl">메모</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{log.memo}</p>
        </>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={onEdit} className="btn-dark">
          수정하기
        </button>
        {/* 그날 잘 입었으면 그대로 코디로 남기고 싶어진다. 옷을 다시 고르게 하지 않는다.
            같은 조합이 이미 있으면 코디 만들기 화면이 바로 알려주므로 여기서는 안 따진다. */}
        {studioHref ? (
          <WarmLink href={studioHref} className="btn-light">
            이 조합으로 코디 만들기
          </WarmLink>
        ) : null}
        <button type="button" onClick={onClose} className="btn-light">
          닫기
        </button>
      </div>
    </div>
  );
}
