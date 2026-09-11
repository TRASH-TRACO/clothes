import { GridSkeleton, Skeleton } from "@/components/skeleton";

/** 그날 기록 보기 화면의 뼈대 (달력 뼈대가 뜨지 않게 여기서 따로 잡는다) */
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 lg:px-10">
      <Skeleton className="h-3 w-24" />

      <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Skeleton className="h-3 w-12" />
          <Skeleton className="mt-3 h-12 w-52 sm:h-14 sm:w-64" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-5 w-24" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        </div>
      </div>

      {/* 그날 체감 알약 */}
      <Skeleton className="mt-8 h-9 w-28 rounded-full" />

      <Skeleton className="mt-10 h-7 w-32" />
      <GridSkeleton count={4} className="mt-5 grid-cols-3 sm:grid-cols-4 lg:grid-cols-6" />

      <div className="mt-12 flex gap-3">
        <Skeleton className="h-12 w-28 rounded-full" />
        <Skeleton className="h-12 w-28 rounded-full" />
      </div>
    </div>
  );
}
