import type { Metadata } from "next";
import Link from "next/link";

import { CalendarMonth } from "@/components/calendar-month";
import {
  isValidMonth,
  monthGrid,
  monthLabel,
  monthOf,
  seoulToday,
  shiftMonth,
} from "@/lib/calendar";
import { getWearLogs } from "@/lib/data";
import { getDailyRange } from "@/lib/weather";

export const metadata: Metadata = { title: "캘린더" };

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const params = await searchParams;
  const today = seoulToday();
  const month =
    typeof params.m === "string" && isValidMonth(params.m) ? params.m : monthOf(today);

  const weeks = monthGrid(month);
  const from = weeks[0][0];
  const to = weeks[weeks.length - 1][6];

  // 날씨는 없어도 달력은 떠야 하므로 실패해도 빈 Map이 온다
  const [logs, weather] = await Promise.all([getWearLogs(from, to), getDailyRange(from, to)]);
  const logsByDate = new Map(logs.map((log) => [log.worn_on, log]));

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

      <CalendarMonth
        month={month}
        weeks={weeks}
        logs={logsByDate}
        weather={weather}
        today={today}
      />

      <p className="mt-6 text-sm text-muted">
        날짜를 누르면 그날 입은 옷을 남길 수 있습니다. 기온과 강수량은 자동으로 채워집니다.
      </p>
    </div>
  );
}
