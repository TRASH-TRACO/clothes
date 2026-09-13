import { CalendarGridSkeleton, TitleSkeleton } from "@/components/skeleton";

/** 다른 화면에서 캘린더로 처음 들어올 때. 월을 옮길 때는 판만 바뀐다 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 lg:px-10">
      <TitleSkeleton />
      <CalendarGridSkeleton />
    </div>
  );
}
