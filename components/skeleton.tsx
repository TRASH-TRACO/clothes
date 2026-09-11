/** 로딩 중 자리를 잡아두는 회색 블록 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-mist ${className}`} />;
}

/** 페이지 제목 자리 */
export function TitleSkeleton() {
  return (
    <div className="mb-8">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-3 h-12 w-56 sm:h-14 sm:w-72" />
    </div>
  );
}

/** 칩 줄 */
export function ChipsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-9 w-20 rounded-full" />
      ))}
    </div>
  );
}

/** 정사각 사진 그리드 */
export function GridSkeleton({ count = 8, className = "" }: { count?: number; className?: string }) {
  return (
    <div className={`grid gap-x-4 gap-y-10 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          <Skeleton className="aspect-square rounded-xl" />
          <Skeleton className="mt-3 h-3 w-16" />
          <Skeleton className="mt-2 h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}
