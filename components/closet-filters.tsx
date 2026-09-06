"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { ColorDot } from "@/components/color-dot";
import { CATEGORY_META, SLOT_ORDER } from "@/lib/categories";

type Props = {
  colors: { name: string; hex: string; count: number }[];
  counts: Record<string, number>;
};

export function ClosetFilters({ colors, counts }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeCategory = searchParams.get("category");
  const activeColor = searchParams.get("color");
  const activeSort = searchParams.get("sort") ?? "recent";

  /** toggle이면 이미 선택된 값을 다시 눌렀을 때 해제된다 */
  function apply(key: string, value: string | null, toggle = false) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || (toggle && params.get(key) === value)) params.delete(key);
    else params.set(key, value);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const value = new FormData(event.currentTarget).get("q");
          apply("q", String(value ?? "").trim() || null);
        }}
        className="flex gap-2"
      >
        <input
          name="q"
          defaultValue={searchParams.get("q") ?? ""}
          placeholder="이름·브랜드 검색"
          className="field max-w-sm"
          aria-label="옷 검색"
        />
        <button type="submit" className="btn-light px-5 py-2">
          검색
        </button>
      </form>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={() => apply("category", null)}
          className={`chip ${activeCategory ? "" : "chip-active"}`}
        >
          전체
        </button>
        {SLOT_ORDER.map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() => apply("category", slot, true)}
            className={`chip ${activeCategory === slot ? "chip-active" : ""}`}
          >
            {CATEGORY_META[slot].label}
            <span className={activeCategory === slot ? "text-white/60" : "text-muted"}>
              {counts[slot] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {colors.length > 0 ? (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <span className="eyebrow shrink-0 pr-1">색상</span>
          {colors.map((color) => (
            <button
              key={color.name}
              type="button"
              onClick={() => apply("color", color.name, true)}
              className={`chip ${activeColor === color.name ? "chip-active" : ""}`}
            >
              <ColorDot hex={color.hex} />
              {color.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <label className="text-sm text-muted" htmlFor="sort">
          정렬
        </label>
        <select
          id="sort"
          value={activeSort}
          onChange={(event) => apply("sort", event.target.value)}
          className="rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink"
        >
          <option value="recent">최근 등록순</option>
          <option value="name">이름순</option>
        </select>
      </div>
    </div>
  );
}
