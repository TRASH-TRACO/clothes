import Link from "next/link";

import { RatingGlyph } from "@/components/feedback-glyph";
import { ItemPhoto } from "@/components/item-photo";
import { OutfitPhoto } from "@/components/outfit-photo";
import { CATEGORY_META } from "@/lib/categories";
import { RATING_LABELS } from "@/lib/feedback";
import type { OutfitWithItems } from "@/lib/types";

export function OutfitCard({ outfit }: { outfit: OutfitWithItems }) {
  const filled = outfit.items.filter((entry) => entry.item !== null);

  return (
    <Link href={`/outfits/${outfit.id}`} prefetch={false} className="group block">
      {/* 착장 사진이 있으면 그게 대표 이미지, 없으면 옷 4장 그리드 */}
      {outfit.photo_path ? (
        <OutfitPhoto
          path={outfit.photo_path}
          alt={`${outfit.name} 착장 사진`}
          className="aspect-square rounded-xl"
          sizes="(max-width: 768px) 50vw, 320px"
        />
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
          <span className="truncate">{outfit.name}</span>
        </p>
        <p className="mt-1 text-sm text-muted">
          {filled.map((entry) => CATEGORY_META[entry.slot].label).join(" · ")}
        </p>
      </div>
    </Link>
  );
}
