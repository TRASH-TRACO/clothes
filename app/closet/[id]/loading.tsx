import { ChipsSkeleton, Skeleton } from "@/components/skeleton";

/** 옷 상세·수정 화면의 뼈대 (옷장 그리드 뼈대가 뜨지 않게) */
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
      <Skeleton className="h-3 w-20" />
      <div className="mt-6 grid gap-12 lg:grid-cols-2">
        <Skeleton className="aspect-square rounded-2xl" />
        <div>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-3 h-11 w-3/4" />
          <Skeleton className="mt-4 h-4 w-32" />
          <div className="mt-8">
            <ChipsSkeleton count={4} />
          </div>
          <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-line sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-paper px-4 py-6">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="mt-3 h-7 w-14" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
