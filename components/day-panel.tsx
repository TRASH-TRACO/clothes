"use client";

import { WarmLink } from "@/components/warm-link";
import { useEffect, useState } from "react";

import { FeltGlyph } from "@/components/feedback-glyph";
import { ItemPhoto } from "@/components/item-photo";
import { OutfitPhoto } from "@/components/outfit-photo";
import { WearForm } from "@/components/wear-form";
import { saveWearLog } from "@/app/actions/wear";
import { CATEGORY_META } from "@/lib/categories";
import { dayLabel, seoulToday } from "@/lib/calendar";
import { FELT_LABELS } from "@/lib/feedback";
import { isPlace, roundPlace, type Place } from "@/lib/places";
import type { WearLogWithItems } from "@/lib/types";
import { weatherKind, weatherLabel, type DayWeather } from "@/lib/weather-codes";
import { WeatherGlyph } from "@/components/weather-glyph";

type Props = {
  date: string;
  log: WearLogWithItems | null;
  day: DayWeather | null;
  basePlace: Place;
  /** 바로 수정 화면으로 열지 */
  startInEdit?: boolean;
  onClose: () => void;
};

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
  const place = pinned ?? basePlace;
  const today = seoulToday();

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
        role="dialog"
        aria-modal="true"
        aria-label={dayLabel(date)}
        className="relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl
          bg-paper sm:max-h-[88dvh] sm:max-w-3xl sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 pt-6 pb-5">
          <div>
            <p className="eyebrow">{date === today ? "오늘" : date > today ? "예정" : "기록"}</p>
            <h2 className="display mt-2 text-3xl sm:text-4xl">{dayLabel(date)}</h2>
            {day ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                <WeatherGlyph kind={weatherKind(day.code)} className="h-4 w-4 shrink-0" />
                {day.high === null ? "―" : `${Math.round(day.high)}°`}
                {day.low === null ? "" : ` / ${Math.round(day.low)}°`} · {weatherLabel(day.code)} ·{" "}
                {place.name}
                {pinned ? "" : " (기본)"}
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
          {editing ? (
            <WearForm
              date={date}
              log={log}
              basePlace={basePlace}
              place={pinned}
              action={saveWearLog}
              onCancel={onClose}
            />
          ) : (
            <DayView log={log!} onEdit={() => setEditing(true)} onClose={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}

function DayView({
  log,
  onEdit,
  onClose,
}: {
  log: WearLogWithItems;
  onEdit: () => void;
  onClose: () => void;
}) {
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
            {log.outfit.name}
          </WarmLink>
        </p>
      ) : null}

      {log.outfit?.photo_path ? (
        <OutfitPhoto
          path={log.outfit.photo_path}
          alt={`${log.outfit.name} 착장 사진`}
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
        <button type="button" onClick={onClose} className="btn-light">
          닫기
        </button>
      </div>
    </div>
  );
}
