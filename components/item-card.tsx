import Link from "next/link";

import { ColorDot } from "@/components/color-dot";
import { ItemPhoto } from "@/components/item-photo";
import { CATEGORY_META, formatMeasurements } from "@/lib/categories";
import type { Item } from "@/lib/types";

export function ItemCard({ item, priority }: { item: Item; priority?: boolean }) {
  const measurements = formatMeasurements(item.category, item.measurements);

  return (
    <Link href={`/closet/${item.id}`} className="group block">
      <ItemPhoto
        path={item.photo_path}
        alt={item.name}
        category={item.category}
        priority={priority}
        className="aspect-square rounded-xl"
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />
      <div className="mt-3 space-y-1">
        <p className="text-xs uppercase tracking-[0.12em] text-muted">
          {CATEGORY_META[item.category].label}
        </p>
        <p className="text-sm font-semibold group-hover:underline">{item.name}</p>
        {item.brand ? <p className="text-sm text-muted">{item.brand}</p> : null}
        <p className="flex items-center gap-2 text-sm text-muted">
          <ColorDot hex={item.color_hex} />
          {item.color_name}
          {item.size_label ? <span className="text-line">|</span> : null}
          {item.size_label}
        </p>
        {measurements ? (
          <p className="truncate text-xs text-muted" title={measurements}>
            {measurements}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
