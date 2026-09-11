import type { Metadata } from "next";
import Link from "next/link";

import { CalendarView } from "@/components/calendar-view";
import {
  isValidMonth,
  monthGrid,
  monthLabel,
  monthOf,
  seoulToday,
  shiftMonth,
} from "@/lib/calendar";
import { getBasePlace, getWearLogs, logPlace } from "@/lib/data";
import type { Place } from "@/lib/places";
import { getCalendarWeather } from "@/lib/weather-store";

export const metadata: Metadata = { title: "캘린더" };

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const params = await searchParams;
  const today = seoulToday();
  const month =
    typeof params.m === "string" && isValidMonth(params.m) ? params.m : monthOf(today);

  const weeks = monthGrid(month);
  const from = weeks[0][0];
  const to = weeks[weeks.length - 1][6];

  const [logs, base] = await Promise.all([getWearLogs(from, to), getBasePlace()]);
  const logsByDate = new Map(logs.map((log) => [log.worn_on, log]));

  // 여행 간 날은 그 지역으로, 나머지는 기본 지역으로 본다
  const placeByDate = new Map<string, Place>();
  for (const log of logs) {
    const place = logPlace(log);
    if (place) placeByDate.set(log.worn_on, place);
  }

  // 지난 날짜는 저장해 둔 값, 오늘부터는 예보. 실패해도 빈 Map이라 달력은 그대로 뜬다
  const weather = await getCalendarWeather(base, placeByDate, weeks.flat());

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 lg:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">What I wore</p>
          <h1 className="display mt-2 text-5xl sm:text-6xl">{monthLabel(month)}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/calendar?m=${shiftMonth(month, -1)}`} className="chip" aria-label="지난달">
            ←
          </Link>
          <Link href={`/calendar?m=${monthOf(today)}`} className="chip">
            이번 달
          </Link>
          <Link href={`/calendar?m=${shiftMonth(month, 1)}`} className="chip" aria-label="다음달">
            →
          </Link>
        </div>
      </div>

      <CalendarView
        month={month}
        weeks={weeks}
        logs={logsByDate}
        weather={weather}
        today={today}
        basePlace={base}
      />

      <p className="mt-6 text-sm text-muted">
        날짜를 누르면 그 자리에서 바로 열립니다. 그날 입은 옷과 있던 지역을 남길 수 있습니다. 기온과 강수량은{" "}
        <Link href="/settings" className="underline underline-offset-4 hover:text-ink">
          기본 지역({base.name})
        </Link>{" "}
        기준이고, 여행을 적어둔 날은 그 지역으로 봅니다. 지난 날씨는 한 번 받아 저장해 두므로
        나중에 다시 열어도 그대로입니다.
      </p>
    </div>
  );
}
