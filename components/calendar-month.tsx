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

/** 비 온(올) 날 표시. 점보다 물방울이 한눈에 읽힌다 */
function RainDrop({ amount }: { amount: number }) {
  const label = `강수량 ${amount}mm`;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      role="img"
      aria-label={label}
      className="h-3 w-3 shrink-0 text-rain"
    >
      <title>{label}</title>
      <path d="M12 2.6c3.4 4.5 5.6 7.3 5.6 10.2a5.6 5.6 0 0 1-11.2 0C6.4 9.9 8.6 7.1 12 2.6Z" />
    </svg>
  );
}

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

/** 그날 대표 이미지: 착장 사진 > 입은 옷 (최대 4장, 2×2) */
function Thumb({ log }: { log: WearLogWithItems }) {
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

  const shown = log.items.slice(0, 4);
  if (shown.length === 0) return null;

  if (shown.length === 1) {
    return (
      <ItemPhoto
        path={shown[0].photo_path}
        alt={shown[0].name}
        category={shown[0].category}
        className="min-h-0 flex-1 rounded"
        sizes="(max-width: 640px) 14vw, 120px"
        compact
      />
    );
  }

  // 2장이면 한 줄, 3~4장이면 두 줄로 알아서 쌓인다
  return (
    <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-px">
      {shown.map((item) => (
        <ItemPhoto
          key={item.id}
          path={item.photo_path}
          alt={item.name}
          category={item.category}
          className="min-h-0 rounded-[3px]"
          sizes="(max-width: 640px) 8vw, 60px"
          compact
        />
      ))}
    </div>
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
              // 한 판에 40칸이 넘는다. 미리 받아두면 달력을 열 때마다 40번을 부른다.
              // loading.tsx 가 있어 눌렀을 때 바로 뼈대가 뜨므로 미리 받을 이유가 없다.
              prefetch={false}
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
                  <RainDrop amount={day.rainAmount} />
                )}
              </div>

              {log ? <Thumb log={log} /> : <div className="min-h-0 flex-1" />}

              <div className={outside ? "opacity-50" : ""}>
                {day ? <Temps day={day} /> : null}
                {day && day.rainAmount !== null && day.rainAmount >= 0.5 ? (
                  <p className="hidden text-[10px] leading-tight text-rain sm:block">
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
