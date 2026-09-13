import { Skeleton } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 lg:px-10">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-12 w-80 max-w-full" />
      <Skeleton className="mt-6 h-4 w-full max-w-lg" />
      <Skeleton className="mt-10 h-12 w-full" />
      <Skeleton className="mt-4 h-12 w-48" />
    </div>
  );
}
