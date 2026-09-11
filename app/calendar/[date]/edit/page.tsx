import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { WearEditor } from "@/components/wear-editor";
import { dayLabel, isValidDate } from "@/lib/calendar";

export async function generateMetadata({
  params,
}: PageProps<"/calendar/[date]/edit">): Promise<Metadata> {
  const { date } = await params;
  return { title: isValidDate(date) ? `${dayLabel(date)} 기록` : "캘린더" };
}

export default async function EditWearDayPage({ params }: PageProps<"/calendar/[date]/edit">) {
  const { date } = await params;
  if (!isValidDate(date)) notFound();
  return <WearEditor date={date} />;
}
