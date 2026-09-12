"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useRef } from "react";

import { CalendarMonth } from "@/components/calendar-month";
import { DayPanel } from "@/components/day-panel";
import { isValidDate } from "@/lib/calendar";
import type { Place } from "@/lib/places";
import type { WearLogWithItems } from "@/lib/types";
import type { RecordedDay } from "@/lib/weather-codes";

type Props = {
  month: string;
  weeks: string[][];
  logs: Map<string, WearLogWithItems>;
  weather: Map<string, RecordedDay>;
  today: string;
  basePlace: Place;
};

/**
 * 달력과 그 위에 뜨는 날짜 패널.
 *
 * 어느 날짜가 열려 있는지는 주소(`?d=`)에 담는다. 그래야 링크를 복사해 열 수 있고
 * 뒤로 가기로 닫힌다. 주소는 history.pushState 로만 바꾸므로 서버를 부르지 않는다.
 */
export function CalendarView({ month, weeks, logs, weather, today, basePlace }: Props) {
  const params = useSearchParams();
  const raw = params.get("d");
  const openDate = raw && isValidDate(raw) ? raw : null;
  const startInEdit = params.get("edit") === "1";

  // 우리가 연 것이면 뒤로 가기로 닫고, 주소로 바로 들어온 것이면 주소만 정리한다
  const pushed = useRef(false);

  const open = useCallback(
    (date: string) => {
      const next = new URLSearchParams(params.toString());
      next.set("m", month);
      next.set("d", date);
      next.delete("edit");
      pushed.current = true;
      window.history.pushState(null, "", `?${next.toString()}`);
    },
    [month, params],
  );

  const close = useCallback(() => {
    if (pushed.current) {
      pushed.current = false;
      window.history.back();
      return;
    }
    const next = new URLSearchParams(params.toString());
    next.delete("d");
    next.delete("edit");
    const query = next.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, [params]);

  return (
    <>
      <CalendarMonth
        onPick={open}
        month={month}
        weeks={weeks}
        logs={logs}
        weather={weather}
        today={today}
      />

      {openDate ? (
        <DayPanel
          key={openDate}
          date={openDate}
          log={logs.get(openDate) ?? null}
          day={weather.get(openDate) ?? null}
          basePlace={basePlace}
          startInEdit={startInEdit}
          onClose={close}
        />
      ) : null}
    </>
  );
}
