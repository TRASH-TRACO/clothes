import Image from "next/image";

import { photoUrl } from "@/lib/supabase/env";

type Props = {
  path: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
};

/**
 * 착장 사진. 옷 사진(ItemPhoto)과 달리 카테고리 플레이스홀더가 없어서,
 * 경로가 없으면 아무것도 그리지 않는다.
 */
export function OutfitPhoto({ path, alt, className = "", sizes, priority }: Props) {
  const url = photoUrl(path);
  if (!url) return null;

  return (
    <div className={`relative overflow-hidden bg-mist ${className}`}>
      <Image
        src={url}
        alt={alt}
        fill
        sizes={sizes ?? "(max-width: 768px) 100vw, 400px"}
        priority={priority}
        // 인증이 필요한 경로라 최적화기가 못 가져온다 (헤더를 전달하지 않음)
        unoptimized
        className="object-cover"
      />
    </div>
  );
}
