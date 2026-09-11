import { saveWearLog } from "@/app/actions/wear";
import { DayHeader } from "@/components/day-header";
import { WearForm } from "@/components/wear-form";
import { getBasePlace, getWearLog, logPlace } from "@/lib/data";
import { getDayWeather } from "@/lib/weather-store";

/**
 * 그날 기록을 남기는 화면.
 * /calendar/[date]/edit 와, 아직 아무것도 안 남긴 날의 /calendar/[date] 가 같이 쓴다.
 * (기록이 없는 날을 /edit 로 돌려보내면 서버를 한 번 더 다녀오게 된다)
 */
export async function WearEditor({ date }: { date: string }) {
  // 옷·코디 목록은 캘린더 레이아웃이 이미 실어뒀다 (components/closet-data.tsx).
  // 날짜마다 달라지는 것만 여기서 불러온다.
  const [log, base] = await Promise.all([getWearLog(date), getBasePlace()]);

  const override = logPlace(log);
  const place = override ?? base;
  const day = await getDayWeather(date, place, override !== null);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 lg:px-10">
      <DayHeader date={date} place={place} pinned={override !== null} day={day} />
      <WearForm
        date={date}
        log={log}
        basePlace={base}
        place={override}
        action={saveWearLog}
      />
    </div>
  );
}
