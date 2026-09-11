import { notFound, redirect } from "next/navigation";

import { isValidDate, monthOf } from "@/lib/calendar";

export default async function EditWearDayPage({ params }: PageProps<"/calendar/[date]/edit">) {
  const { date } = await params;
  if (!isValidDate(date)) notFound();
  redirect(`/calendar?m=${monthOf(date)}&d=${date}&edit=1`);
}
