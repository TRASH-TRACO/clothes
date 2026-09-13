import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { CalendarBoard } from "@/components/calendar-board";
import { CalendarGridSkeleton } from "@/components/skeleton";
import {
  isValidMonth,
  monthGrid,
  monthLabel,
  monthOf,
  seoulToday,
  shiftMonth,
} from "@/lib/calendar";

export const metadata: Metadata = { title: "캘린더" };

/**
 * 달력.
 *
 * 이 화면은 **아무것도 기다리지 않는다.** 월 이름과 앞뒤 버튼은 주소만 보면
 * 정해지므로 곧바로 그린다. 기록과 날씨를 받아오는 일은 Suspense 안으로 넣어
 * 판만 스켈레톤으로 기다리게 했다.
 *
 * 그래서 다음 달을 누르면 제목이 먼저 바뀌고, 판은 조금 뒤에 채워진다.
 * 예전에는 화면 전체가 스켈레톤으로 바뀌었다가 돌아와서, 눌렀는지도 모르고
 * 한참 멈춘 것처럼 보였다.
 *
 * key 를 월로 주는 게 핵심이다. 이게 없으면 월을 옮겨도 경계가 다시 기다리지
 * 않아서 옛 판이 그대로 남는다.
 */
export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  const params = await searchParams;
  const today = seoulToday();
  const month =
    typeof params.m === "string" && isValidMonth(params.m) ? params.m : monthOf(today);

  // 주 수는 주소만으로 정해진다. 스켈레톤도 같은 높이로 만들어 두면 판이
  // 들어올 때 화면이 안 튄다.
  const rows = monthGrid(month).length;

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

      <Suspense key={month} fallback={<CalendarGridSkeleton rows={rows} />}>
        <CalendarBoard month={month} today={today} />
      </Suspense>
    </div>
  );
}
