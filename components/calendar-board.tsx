import Link from "next/link";

import { CalendarView } from "@/components/calendar-view";
import { monthGrid } from "@/lib/calendar";
import { getBasePlace, getWearLogs, getWearPool, logPlace } from "@/lib/data";
import { pickSimilar } from "@/lib/similar-day";
import type { SimilarDay } from "@/lib/types";
import { weatherKind } from "@/lib/weather-codes";
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

  const [logs, base, pool] = await Promise.all([
    getWearLogs(from, to),
    getBasePlace(),
    getWearPool(),
  ]);
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

  /**
   * 빈 날마다 "이 날씨와 비슷했던 날" 을 **여기서 미리 골라 둔다.**
   *
   * 예전에는 날짜를 누를 때 서버 액션으로 찾았다. 서버 액션은 지금 화면의 서버
   * 컴포넌트를 통째로 다시 그려 돌려주므로, 날짜 하나 눌렀을 뿐인데 그 달의
   * 기록과 날씨를 다시 받아오고 있었다 (같은 달인데도 새로 불러오는 것처럼
   * 보이던 게 이것이다). 이제 날짜를 눌러도 서버를 안 부른다.
   *
   * 셈은 아무것도 안 묻는 함수가 한다 (lib/similar-day.ts). 한 달은 많아야
   * 42칸이고 후보는 수백 줄이라 눈에 띄는 비용이 아니다.
   */
  const suggestions = new Map<string, SimilarDay>();
  if (pool.length > 0) {
    for (const date of weeks.flat()) {
      // 이미 옷을 적어 둔 날에는 권할 이유가 없다
      const log = logsByDate.get(date);
      if (log && log.items.length > 0) continue;

      const day = weather.get(date);
      if (!day || day.high === null || day.low === null) continue;

      const best = pickSimilar(
        { high: day.high, low: day.low, kind: weatherKind(day.code) },
        // 그날 자신은 후보에서 뺀다
        pool.filter((candidate) => candidate.date !== date),
      );
      if (!best) continue;

      suggestions.set(date, {
        date: best.date,
        code: best.code,
        high: best.high,
        low: best.low,
        itemIds: best.itemIds,
        felt: best.felt,
      });
    }
  }

  return (
    <>
      <CalendarView
        month={month}
        weeks={weeks}
        logs={logsByDate}
        weather={weather}
        today={today}
        basePlace={base}
        suggestions={suggestions}
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
