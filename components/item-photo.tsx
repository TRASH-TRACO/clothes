import Image from "next/image";

import { CATEGORY_META, type Category } from "@/lib/categories";
import { photoUrl } from "@/lib/supabase/env";

type Props = {
  path: string | null;
  alt: string;
  category: Category;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** 달력 칸처럼 좁은 자리. 사진이 없을 때 글자를 작게 넣는다 */
  compact?: boolean;
};

/** 사진이 없으면 카테고리 이름을 크게 박은 플레이스홀더를 보여준다. */
export function ItemPhoto({
  path,
  alt,
  category,
  className = "",
  sizes,
  priority,
  compact = false,
}: Props) {
  const url = photoUrl(path);

  return (
    <div className={`relative overflow-hidden bg-mist ${className}`}>
      {url ? (
        <Image
          src={url}
          alt={alt}
          fill
          sizes={sizes ?? "(max-width: 768px) 50vw, 25vw"}
          priority={priority}
          // 인증이 필요한 경로라 최적화기가 못 가져온다 (헤더를 전달하지 않음)
          unoptimized
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center overflow-hidden px-1">
          <span className={`display text-line ${compact ? "truncate text-[9px]" : "text-2xl"}`}>
            {CATEGORY_META[category].en}
          </span>
        </div>
      )}
    </div>
  );
}
