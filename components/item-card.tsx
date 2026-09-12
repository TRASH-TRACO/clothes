import { WarmLink } from "@/components/warm-link";

import { ColorDot } from "@/components/color-dot";
import { ItemPhoto } from "@/components/item-photo";
import { CATEGORY_META, formatMeasurements } from "@/lib/categories";
import { FIT_SHORT } from "@/lib/feedback";
import type { Item } from "@/lib/types";

export function ItemCard({ item, priority }: { item: Item; priority?: boolean }) {
  const measurements = formatMeasurements(item.category, item.measurements);

  return (
    <WarmLink href={`/closet/${item.id}`} className="group block">
      <ItemPhoto
        path={item.photo_path}
        alt={item.name}
        category={item.category}
        priority={priority}
        className={`aspect-square rounded-xl ${item.archived_at ? "opacity-55" : ""}`}
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />
      <div className="mt-3 space-y-1">
        <p className="text-xs uppercase tracking-[0.12em] text-muted">
          {CATEGORY_META[item.category].label}
          {item.subcategory ? ` · ${item.subcategory}` : ""}
          {item.archived_at ? " · 보관" : ""}
        </p>
        <p className="text-sm font-semibold group-hover:underline">{item.name}</p>
        {item.brand ? <p className="text-sm text-muted">{item.brand}</p> : null}
        <p className="flex items-center gap-2 text-sm text-muted">
          <ColorDot hex={item.color_hex} />
          {item.color_name}
          {item.size_label ? <span className="text-line">|</span> : null}
          {item.size_label}
          {item.fit ? <span className="text-line">|</span> : null}
          {item.fit ? FIT_SHORT[item.fit] : null}
        </p>
        {measurements ? (
          <p className="truncate text-xs text-muted" title={measurements}>
            {measurements}
          </p>
        ) : null}
      </div>
    </WarmLink>
  );
}
