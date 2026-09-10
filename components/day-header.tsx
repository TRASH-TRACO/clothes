import Link from "next/link";

import { WeatherGlyph } from "@/components/weather-glyph";
import { dayLabel, seoulToday } from "@/lib/calendar";
import type { Place } from "@/lib/places";
import { weatherKind, weatherLabel, type DayWeather } from "@/lib/weather";

type Props = {
  date: string;
  place: Place;
  /** 이 날만 따로 정한 지역인지 (아니면 기본 지역) */
  pinned: boolean;
  day: DayWeather | null;
};

/** 날짜 화면 위쪽: 돌아가기 · 날짜 · 그날 날씨 */
export function DayHeader({ date, place, pinned, day }: Props) {
  const today = seoulToday();

  return (
    <>
      <Link
        href={`/calendar?m=${date.slice(0, 7)}`}
        className="text-sm text-muted underline underline-offset-4 hover:text-ink"
      >
        ← {date.slice(0, 4)}년 {Number(date.slice(5, 7))}월
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">{date === today ? "오늘" : date > today ? "예정" : "기록"}</p>
          <h1 className="display mt-2 text-5xl sm:text-6xl">{dayLabel(date)}</h1>
        </div>

        {day ? (
          <div className="flex items-center gap-4">
            <WeatherGlyph kind={weatherKind(day.code)} className="h-10 w-10 shrink-0" />
            <div>
              <p className="text-lg font-semibold">
                {day.high === null ? "―" : `${Math.round(day.high)}°`}
                <span className="text-muted">
                  {day.low === null ? "" : ` / ${Math.round(day.low)}°`}
                </span>
              </p>
              <p className="mt-1 text-sm text-muted">
                {place.name}
                {pinned ? "" : " (기본)"} · {weatherLabel(day.code)}
                {day.rainAmount !== null && day.rainAmount >= 0.5
                  ? ` · 강수량 ${day.rainAmount < 10 ? day.rainAmount.toFixed(1) : Math.round(day.rainAmount)}mm`
                  : ""}
              </p>
            </div>
          </div>
        ) : (
          // 예보 API가 주는 기간(과거 92일 ~ 이후 15일)을 벗어난 날짜
          <p className="text-sm text-muted">이 날짜의 날씨는 남아 있지 않습니다.</p>
        )}
      </div>
    </>
  );
}
