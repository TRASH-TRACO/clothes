import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { saveWearLog } from "@/app/actions/wear";
import { WeatherGlyph } from "@/components/weather-glyph";
import { WearForm } from "@/components/wear-form";
import { dayLabel, isValidDate, seoulToday } from "@/lib/calendar";
import { getItems, getOutfits, getWearLog } from "@/lib/data";
import { getDailyRange, weatherKind, weatherLabel } from "@/lib/weather";

export async function generateMetadata({ params }: PageProps<"/calendar/[date]">): Promise<Metadata> {
  const { date } = await params;
  return { title: isValidDate(date) ? dayLabel(date) : "캘린더" };
}

export default async function WearDayPage({ params }: PageProps<"/calendar/[date]">) {
  const { date } = await params;
  if (!isValidDate(date)) notFound();

  const [log, items, outfits, weather] = await Promise.all([
    getWearLog(date),
    getItems({ sort: "recent" }),
    getOutfits(),
    getDailyRange(date, date),
  ]);

  const day = weather.get(date);
  const today = seoulToday();

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 lg:px-10">
      <Link
        href={`/calendar?m=${date.slice(0, 7)}`}
        className="text-sm text-muted underline underline-offset-4 hover:text-ink"
      >
        ← {date.slice(0, 4)}년 {Number(date.slice(5, 7))}월
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow">
            {date === today ? "오늘" : date > today ? "예정" : "기록"}
          </p>
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
                {weatherLabel(day.code)}
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

      <WearForm date={date} items={items} outfits={outfits} log={log} action={saveWearLog} />
    </div>
  );
}
