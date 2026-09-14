import { WarmLink } from "@/components/warm-link";

import { ColorDot } from "@/components/color-dot";
import { ItemPhoto } from "@/components/item-photo";
import { CATEGORY_META, formatMeasurements, measurementFields } from "@/lib/categories";
import { FIT_SHORT, PART_FIT_SHORT, readPartFits } from "@/lib/feedback";
import type { Item } from "@/lib/types";

/** 목록 한 칸에 부위별 사이즈감을 몇 개까지 적을지. 넘으면 "+N" */
const PART_LIMIT = 3;

export function ItemCard({ item, priority }: { item: Item; priority?: boolean }) {
  const measurements = formatMeasurements(item.category, item.measurements);

  // "어깨 크다" 처럼. 실측 항목 순서를 따라가서 옷마다 같은 차례로 보인다.
  const notes = readPartFits(item.fit_notes);
  const parts = measurementFields(item.category)
    .filter((field) => notes[field.key])
    .map((field) => `${field.label} ${PART_FIT_SHORT[notes[field.key]]}`);

  return (
    <WarmLink href={`/closet/${item.id}`} className="group block">
      <div className="relative">
        <ItemPhoto
          path={item.photo_path}
          alt={item.name}
          category={item.category}
          priority={priority}
          className={`aspect-square rounded-xl ${item.archived_at ? "opacity-55" : ""}`}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
        {/* 목록에서 숫자를 다 늘어놓아 봐야 안 읽는다. 적어 뒀다는 것만 알면 되고,
            값은 상세나 실측 비교에서 본다 (자세한 값은 title 에 남긴다).
            글자 줄에 두면 이름·색·사이즈에 묻혀서 사진 위로 올렸다. */}
        {measurements ? (
          <span
            title={measurements}
            className="absolute right-2 top-2 rounded-full bg-paper/90 px-2 py-1 text-[10px]
              font-medium text-ink shadow-sm backdrop-blur-sm"
          >
            📏 실측
          </span>
        ) : null}
      </div>

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
        {/* 다음에 살 때 참고하는 값이라 옷장에서 바로 보여야 한다.
            칸이 좁아 몇 개만 적고 나머지는 개수로 (전부는 title 에). */}
        {parts.length > 0 ? (
          <p className="flex flex-wrap gap-1 pt-0.5" title={parts.join(" · ")}>
            {parts.slice(0, PART_LIMIT).map((part) => (
              <span key={part} className="rounded-full bg-mist px-2 py-0.5 text-[11px] text-ink">
                {part}
              </span>
            ))}
            {parts.length > PART_LIMIT ? (
              <span className="px-1 py-0.5 text-[11px] text-muted">
                +{parts.length - PART_LIMIT}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
    </WarmLink>
  );
}
