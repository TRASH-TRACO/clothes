import { ChipsSkeleton, GridSkeleton, Skeleton } from "@/components/skeleton";

/** 그날 기록을 남기는 화면의 뼈대 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 lg:px-10">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-3 w-12" />
      <Skeleton className="mt-3 h-12 w-52 sm:h-14 sm:w-64" />

      <div className="mt-10 space-y-12">
        <section>
          <Skeleton className="h-7 w-40" />
          <div className="mt-5 flex gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-32 shrink-0 rounded-xl" />
            ))}
          </div>
        </section>

        <section>
          <Skeleton className="h-7 w-24" />
          <div className="mt-4">
            <ChipsSkeleton count={7} />
          </div>
          <GridSkeleton count={6} className="mt-6 grid-cols-3 sm:grid-cols-4 lg:grid-cols-6" />
        </section>

        <section>
          <Skeleton className="h-7 w-28" />
          {/* 추웠다 · 적당했다 · 더웠다 */}
          <div className="mt-5 flex gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[86px] w-[104px] rounded-xl" />
            ))}
          </div>
        </section>

        <section>
          <Skeleton className="h-7 w-36" />
          <div className="mt-5">
            <ChipsSkeleton count={10} />
          </div>
        </section>

        <section>
          <Skeleton className="h-3 w-10" />
          <Skeleton className="mt-2 h-24 w-full rounded-lg" />
        </section>

        <div className="flex gap-3">
          <Skeleton className="h-12 w-24 rounded-full" />
          <Skeleton className="h-12 w-24 rounded-full" />
        </div>
      </div>
    </div>
  );
}
