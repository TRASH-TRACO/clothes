import { GridSkeleton, Skeleton } from "@/components/skeleton";

/** 코디 상세 화면의 뼈대 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-4 h-3 w-16" />
      <Skeleton className="mt-3 h-12 w-64 sm:h-14" />
      <Skeleton className="mt-4 h-9 w-32 rounded-full" />
      <GridSkeleton count={4} className="mt-10 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" />
    </div>
  );
}
