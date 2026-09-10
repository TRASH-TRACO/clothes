import Link from "next/link";

import { ItemPhoto } from "@/components/item-photo";
import { OutfitPhoto } from "@/components/outfit-photo";
import { WEEKDAYS, monthOf } from "@/lib/calendar";
import type { WearLogWithItems } from "@/lib/types";
import type { DayWeather } from "@/lib/weather";

type Props = {
  month: string;
  weeks: string[][];
  logs: Map<string, WearLogWithItems>;
  weather: Map<string, DayWeather>;
  today: string;
};

function Temps({ day }: { day: DayWeather }) {
  if (day.high === null && day.low === null) return null;
  return (
    <p className="text-[10px] leading-tight sm:text-[11px]">
      {day.high === null ? "―" : `${Math.round(day.high)}°`}
      <span className="text-muted">
        {day.low === null ? "" : ` ${Math.round(day.low)}°`}
      </span>
    </p>
  );
}

/** 그날 대표 이미지: 착장 사진 > 첫 옷 사진 */
function Thumb({ log }: { log: WearLogWithItems }) {
  const first = log.items[0];

  if (log.outfit?.photo_path) {
    return (
      <OutfitPhoto
        path={log.outfit.photo_path}
        alt={`${log.outfit.name} 착장 사진`}
        className="min-h-0 flex-1 rounded"
        sizes="(max-width: 640px) 14vw, 120px"
      />
    );
  }
  if (!first) return null;

  return (
    <ItemPhoto
      path={first.photo_path}
      alt={first.name}
      category={first.category}
      className="min-h-0 flex-1 rounded"
      sizes="(max-width: 640px) 14vw, 120px"
      compact
    />
  );
}

export function CalendarMonth({ month, weeks, logs, weather, today }: Props) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-px">
        {WEEKDAYS.map((label) => (
          <p
            key={label}
            className="pb-2 text-center text-[11px] uppercase tracking-[0.12em] text-muted"
          >
            {label}
          </p>
        ))}
      </div>

      {/* 칸 사이 1px 선은 배경색이 비쳐서 만들어진다 (홈 카운트 그리드와 같은 방식) */}
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-line">
        {weeks.flat().map((date) => {
          const day = weather.get(date);
          const log = logs.get(date);
          const outside = monthOf(date) !== month;
          const isToday = date === today;

          return (
            <Link
              key={date}
              href={`/calendar/${date}`}
              className={`flex aspect-[3/4] flex-col gap-1 p-1.5 transition-colors sm:aspect-square sm:p-2 ${
                outside ? "bg-mist/60 text-muted" : "bg-paper hover:bg-mist"
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <span
                  className={`text-[11px] font-semibold leading-none sm:text-xs ${
                    isToday
                      ? "-m-0.5 rounded-full bg-ink px-1.5 py-1 text-paper"
                      : outside
                        ? "text-muted"
                        : ""
                  }`}
                >
                  {Number(date.slice(8))}
                </span>
                {day && day.rainAmount !== null && day.rainAmount >= 0.5 && (
                  <span
                    className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"
                    title={`강수량 ${day.rainAmount}mm`}
                    aria-label={`강수량 ${day.rainAmount}mm`}
                  />
                )}
              </div>

              {log ? <Thumb log={log} /> : <div className="min-h-0 flex-1" />}

              <div className={outside ? "opacity-50" : ""}>
                {day ? <Temps day={day} /> : null}
                {day && day.rainAmount !== null && day.rainAmount >= 0.5 ? (
                  <p className="hidden text-[10px] leading-tight text-accent sm:block">
                    {day.rainAmount < 10 ? day.rainAmount.toFixed(1) : Math.round(day.rainAmount)}mm
                  </p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
