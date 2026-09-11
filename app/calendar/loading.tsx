import { Skeleton, TitleSkeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 lg:px-10">
      <TitleSkeleton />
      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="mx-auto mb-2 h-3 w-6" />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl bg-line">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] bg-paper p-1.5 sm:aspect-square sm:p-2">
            <Skeleton className="h-3 w-4" />
          </div>
        ))}
      </div>
    </div>
  );
}
