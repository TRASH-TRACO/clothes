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
};

/** 사진이 없으면 카테고리 이름을 크게 박은 플레이스홀더를 보여준다. */
export function ItemPhoto({ path, alt, category, className = "", sizes, priority }: Props) {
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
          className="object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="display text-2xl text-line">{CATEGORY_META[category].en}</span>
        </div>
      )}
    </div>
  );
}
