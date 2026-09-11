import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DayHeader } from "@/components/day-header";
import { FeltGlyph } from "@/components/feedback-glyph";
import { ItemPhoto } from "@/components/item-photo";
import { OutfitPhoto } from "@/components/outfit-photo";
import { CATEGORY_META } from "@/lib/categories";
import { FELT_LABELS } from "@/lib/feedback";
import { dayLabel, isValidDate } from "@/lib/calendar";
import { getBasePlace, getWearLog, logPlace } from "@/lib/data";
import { getDayWeather } from "@/lib/weather-store";

export async function generateMetadata({
  params,
}: PageProps<"/calendar/[date]">): Promise<Metadata> {
  const { date } = await params;
  return { title: isValidDate(date) ? dayLabel(date) : "캘린더" };
}

export default async function WearDayPage({ params }: PageProps<"/calendar/[date]">) {
  const { date } = await params;
  if (!isValidDate(date)) notFound();

  const log = await getWearLog(date);

  // 남긴 게 없는 날은 볼 것도 없으니 바로 기록하러 보낸다
  if (!log) redirect(`/calendar/${date}/edit`);

  const base = await getBasePlace();
  const override = logPlace(log);
  const place = override ?? base;
  const day = await getDayWeather(date, place, override !== null);

  return (
    <div className="mx-auto max-w-5xl px-6 py-12 lg:px-10">
      <DayHeader date={date} place={place} pinned={override !== null} day={day} />

      {log.felt ? (
        <p className="mt-8 inline-flex items-center gap-2 rounded-full bg-mist px-4 py-2 text-sm font-medium">
          <FeltGlyph value={log.felt} className="h-5 w-5" />
          {FELT_LABELS[log.felt]}
        </p>
      ) : null}

      {log.outfit ? (
        <p className="mt-10 text-sm text-muted">
          저장한 코디{" "}
          <Link
            href={`/outfits/${log.outfit.id}`}
            className="font-semibold text-ink underline underline-offset-4"
          >
            {log.outfit.name}
          </Link>
        </p>
      ) : null}

      {log.outfit?.photo_path ? (
        <OutfitPhoto
          path={log.outfit.photo_path}
          alt={`${log.outfit.name} 착장 사진`}
          className="mt-6 aspect-square max-w-sm rounded-xl"
          sizes="(max-width: 768px) 100vw, 384px"
        />
      ) : null}

      <h2 className="display mt-10 text-2xl">입은 옷 {log.items.length}개</h2>
      {log.items.length === 0 ? (
        <p className="mt-4 text-muted">옷은 남기지 않고 지역만 기록한 날입니다.</p>
      ) : (
        <div className="mt-5 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
          {log.items.map((item) => (
            <Link key={item.id} href={`/closet/${item.id}`} className="group">
              <ItemPhoto
                path={item.photo_path}
                alt={item.name}
                category={item.category}
                className="aspect-square rounded-xl"
                sizes="(max-width: 640px) 30vw, 160px"
              />
              <p className="mt-2 truncate text-xs font-semibold group-hover:underline">
                {item.name}
              </p>
              <p className="truncate text-xs text-muted">{CATEGORY_META[item.category].label}</p>
            </Link>
          ))}
        </div>
      )}

      {log.memo ? (
        <>
          <h2 className="display mt-10 text-2xl">메모</h2>
          <p className="mt-3 whitespace-pre-wrap text-muted">{log.memo}</p>
        </>
      ) : null}

      <div className="mt-12 flex flex-wrap gap-3">
        <Link href={`/calendar/${date}/edit`} className="btn-dark">
          수정하기
        </Link>
        <Link href={`/calendar?m=${date.slice(0, 7)}`} className="btn-light">
          캘린더로
        </Link>
      </div>
    </div>
  );
}
