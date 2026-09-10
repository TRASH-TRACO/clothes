"use client";

import { useState, useTransition } from "react";

import { searchPlaces } from "@/app/actions/places";
import { QUICK_PLACES, samePlace, type Place } from "@/lib/places";

type Props = {
  /** 지금 고른 곳. null이면 "정하지 않음" */
  value: Place | null;
  onChange: (place: Place | null) => void;
  /** 고르지 않은 상태를 허용할지 (날짜별 지역은 비워둘 수 있다) */
  clearable?: boolean;
  clearLabel?: string;
};

/**
 * 지역 고르기. 자주 쓰는 곳은 바로 누르고, 없으면 검색한다.
 * 검색은 open-meteo 지오코딩이라 해외도 나온다 (여행 기록용).
 */
export function PlacePicker({ value, onChange, clearable = false, clearLabel = "정하지 않음" }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[] | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    const keyword = query.trim();
    if (keyword.length < 2) return;
    startTransition(async () => {
      setResults(await searchPlaces(keyword));
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {clearable && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className={`chip ${value === null ? "chip-active" : ""}`}
          >
            {clearLabel}
          </button>
        )}
        {QUICK_PLACES.map((place) => (
          <button
            key={place.name}
            type="button"
            onClick={() => onChange(place)}
            className={`chip ${value && samePlace(value, place) ? "chip-active" : ""}`}
          >
            {place.name}
          </button>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            // 폼 안에 있으므로 엔터가 제출로 새지 않게 막는다
            if (event.key === "Enter") {
              event.preventDefault();
              run();
            }
          }}
          placeholder="다른 도시 찾기 (예: 후쿠오카)"
          className="field"
        />
        <button type="button" onClick={run} disabled={pending} className="btn-light shrink-0">
          {pending ? "찾는 중…" : "검색"}
        </button>
      </div>

      {results !== null && (
        <div className="mt-3">
          {results.length === 0 ? (
            <p className="text-sm text-muted">찾지 못했습니다. 다른 이름으로 검색해보세요.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {results.map((place) => (
                <button
                  key={`${place.lat},${place.lon}`}
                  type="button"
                  onClick={() => onChange(place)}
                  className={`chip ${value && samePlace(value, place) ? "chip-active" : ""}`}
                >
                  {place.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {value ? (
        <>
          <p className="mt-4 text-sm text-muted">
            고른 곳: <span className="font-semibold text-ink">{value.name}</span>
          </p>
          <input type="hidden" name="place_name" value={value.name} />
          <input type="hidden" name="place_lat" value={value.lat} />
          <input type="hidden" name="place_lon" value={value.lon} />
        </>
      ) : null}
    </div>
  );
}
