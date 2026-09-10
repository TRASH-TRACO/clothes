import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { saveWearLog } from "@/app/actions/wear";
import { DayHeader } from "@/components/day-header";
import { WearForm } from "@/components/wear-form";
import { dayLabel, isValidDate } from "@/lib/calendar";
import { getBasePlace, getItems, getOutfits, getWearLog, logPlace } from "@/lib/data";
import { getDayWeather } from "@/lib/weather-store";

export async function generateMetadata({
  params,
}: PageProps<"/calendar/[date]/edit">): Promise<Metadata> {
  const { date } = await params;
  return { title: isValidDate(date) ? `${dayLabel(date)} 기록` : "캘린더" };
}

export default async function EditWearDayPage({ params }: PageProps<"/calendar/[date]/edit">) {
  const { date } = await params;
  if (!isValidDate(date)) notFound();

  const [log, items, outfits, base] = await Promise.all([
    getWearLog(date),
    getItems({ sort: "recent" }),
    getOutfits(),
    getBasePlace(),
  ]);

  const override = logPlace(log);
  const place = override ?? base;
  const day = await getDayWeather(date, place, override !== null);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 lg:px-10">
      <DayHeader date={date} place={place} pinned={override !== null} day={day} />
      <WearForm
        date={date}
        items={items}
        outfits={outfits}
        log={log}
        basePlace={base}
        place={override}
        action={saveWearLog}
      />
    </div>
  );
}
