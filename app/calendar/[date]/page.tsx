import { notFound, redirect } from "next/navigation";

import { isValidDate, monthOf } from "@/lib/calendar";

/**
 * 그날 화면은 이제 달력 위 패널이다 (서버를 부르지 않아 바로 열린다).
 * 예전 주소로 들어오면 패널이 열린 달력으로 보낸다.
 */
export default async function WearDayPage({ params }: PageProps<"/calendar/[date]">) {
  const { date } = await params;
  if (!isValidDate(date)) notFound();
  redirect(`/calendar?m=${monthOf(date)}&d=${date}`);
}
