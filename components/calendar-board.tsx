import Link from "next/link";

import { CalendarView } from "@/components/calendar-view";
import { monthGrid } from "@/lib/calendar";
import { getBasePlace, getWearLogs, logPlace } from "@/lib/data";
import type { Place } from "@/lib/places";
import { getCalendarWeather } from "@/lib/weather-store";

/**
 * 달력 한 판. 기록과 날씨를 받아오는 쪽이라 느릴 수 있다.
 * 화면(app/calendar/page.tsx)에서 Suspense 로 감싸 두어, 이게 오는 동안에도
 * 월 이름과 앞뒤 버튼은 이미 바뀌어 있다.
 */
export async function CalendarBoard({ month, today }: { month: string; today: string }) {
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

  // 기록을 남긴 날은 아직 안 지난 날이어도 지역이 굳는다.
  // 나중에 기본 지역을 바꿔도 그날 날씨가 따라 바뀌면 기록이 아니게 된다.
  const recorded = new Set(logs.map((log) => log.worn_on));

  // 한 번 본 날은 저장해 두고 그대로 쓴다. 실패해도 빈 Map이라 달력은 그대로 뜬다
  const weather = await getCalendarWeather(base, placeByDate, recorded, weeks.flat());

  return (
    <>
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
    </>
  );
}
