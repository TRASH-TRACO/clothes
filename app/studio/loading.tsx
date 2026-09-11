import { ChipsSkeleton, GridSkeleton, Skeleton, TitleSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
      <TitleSkeleton />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div>
          <ChipsSkeleton />
          <GridSkeleton className="mt-6 grid-cols-3 sm:grid-cols-4 lg:grid-cols-5" />
        </div>
        <Skeleton className="h-[420px] rounded-xl" />
      </div>
    </div>
  );
}
