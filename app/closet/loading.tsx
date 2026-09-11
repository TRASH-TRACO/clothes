import { ChipsSkeleton, GridSkeleton, TitleSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
      <TitleSkeleton />
      <ChipsSkeleton count={7} />
      <GridSkeleton className="mt-10 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" />
    </div>
  );
}
