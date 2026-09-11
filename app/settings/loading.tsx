import { ChipsSkeleton, Skeleton, TitleSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 lg:px-10">
      <TitleSkeleton />
      <Skeleton className="h-16 w-full max-w-xl" />
      <div className="mt-8">
        <ChipsSkeleton count={12} />
      </div>
    </div>
  );
}
