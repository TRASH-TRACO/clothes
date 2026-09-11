import { GridSkeleton, TitleSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
      <TitleSkeleton />
      <GridSkeleton count={3} className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />
    </div>
  );
}
