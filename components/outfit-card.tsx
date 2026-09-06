import Link from "next/link";

import { ItemPhoto } from "@/components/item-photo";
import { CATEGORY_META } from "@/lib/categories";
import type { OutfitWithItems } from "@/lib/types";

export function OutfitCard({ outfit }: { outfit: OutfitWithItems }) {
  const filled = outfit.items.filter((entry) => entry.item !== null);

  return (
    <Link href={`/outfits/${outfit.id}`} className="group block">
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
      <div className="mt-3">
        <p className="text-sm font-semibold group-hover:underline">{outfit.name}</p>
        <p className="mt-1 text-sm text-muted">
          {filled.map((entry) => CATEGORY_META[entry.slot].label).join(" · ")}
        </p>
      </div>
    </Link>
  );
}
