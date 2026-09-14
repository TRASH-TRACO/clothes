import { WarmLink } from "@/components/warm-link";

import { RatingGlyph } from "@/components/feedback-glyph";
import { ItemPhoto } from "@/components/item-photo";
import { OutfitPhoto } from "@/components/outfit-photo";
import { CATEGORY_META } from "@/lib/categories";
import { RATING_LABELS } from "@/lib/feedback";
import { outfitTitle } from "@/lib/outfit-title";
import type { OutfitWithItems } from "@/lib/types";

export function OutfitCard({ outfit }: { outfit: OutfitWithItems }) {
  const filled = outfit.items.filter((entry) => entry.item !== null);
  // 이름은 선택이라, 안 지었으면 들어간 옷으로 부른다
  const title = outfitTitle(outfit.name, filled.map((entry) => entry.item!.name));

  return (
    <WarmLink href={`/outfits/${outfit.id}`} className="group block">
      {/* 착장 사진이 있으면 크게 두고 옆에 옷 3장을 세운다.
          착장 사진만 두면 "뭘 입은 코디였더라" 가 사진 한 장에 달리는데, 실루엣만
          보이는 사진도 많다. 옷이 같이 보여야 목록에서 바로 가려낸다. */}
      {outfit.photo_path ? (
        <div className="grid aspect-square grid-cols-3 grid-rows-3 gap-1 overflow-hidden rounded-xl bg-mist p-1">
          <OutfitPhoto
            path={outfit.photo_path}
            alt={`${title} 착장 사진`}
            className="col-span-2 row-span-3 rounded-lg"
            sizes="(max-width: 768px) 34vw, 220px"
          />
          {filled.slice(0, 3).map((entry) => (
            <ItemPhoto
              key={entry.slot}
              path={entry.item!.photo_path}
              alt={entry.item!.name}
              category={entry.item!.category}
              className="rounded-lg"
              sizes="(max-width: 768px) 17vw, 110px"
              compact
            />
          ))}
          {/* 옷이 3벌이 안 되면 빈 칸으로 자리를 잡아 둔다 (사진이 늘어나지 않게) */}
          {Array.from({ length: Math.max(0, 3 - filled.length) }).map((_, index) => (
            <div key={index} className="rounded-lg bg-paper/60" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-xl bg-mist p-1">
          {filled.slice(0, 4).map((entry) => (
            <ItemPhoto
              key={entry.slot}
              path={entry.item!.photo_path}
              alt={entry.item!.name}
              category={entry.item!.category}
              className="aspect-square rounded-lg"
              sizes="(max-width: 768px) 25vw, 180px"
            />
          ))}
          {Array.from({ length: Math.max(0, 4 - filled.length) }).map((_, index) => (
            <div key={index} className="aspect-square rounded-lg bg-paper/60" />
          ))}
        </div>
      )}
      <div className="mt-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold group-hover:underline">
          {outfit.rating ? (
            <>
              <RatingGlyph value={outfit.rating} className="h-4 w-4 shrink-0 text-muted" />
              <span className="sr-only">{RATING_LABELS[outfit.rating]}</span>
            </>
          ) : null}
          <span className="truncate">{title}</span>
        </p>
        <p className="mt-1 text-sm text-muted">
          {filled.map((entry) => CATEGORY_META[entry.slot].label).join(" · ")}
        </p>
      </div>
    </WarmLink>
  );
}
