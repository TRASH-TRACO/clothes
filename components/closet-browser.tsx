"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { ColorDot } from "@/components/color-dot";
import { ItemCard } from "@/components/item-card";
import { CATEGORY_META, SLOT_ORDER, isCategory, kindsOf } from "@/lib/categories";
import type { Item } from "@/lib/types";

type Props = { items: Item[] };

/**
 * 옷장 목록과 필터.
 *
 * 옷은 한 번에 다 받아두고 거르기는 화면에서 한다. 전체 → 아우터처럼 칩을 누를 때마다
 * 서버를 다녀오면 느리고, 옷 수가 수천 장이 될 앱도 아니다.
 * 고른 조건은 주소에 담아 두므로 새로고침하거나 링크를 복사해도 그대로다.
 */
export function ClosetBrowser({ items }: Props) {
  const params = useSearchParams();

  const rawCategory = params.get("category");
  const category = isCategory(rawCategory) ? rawCategory : null;
  const kind = params.get("kind");
  const color = params.get("color");
  const q = params.get("q") ?? "";
  const sort = params.get("sort") === "name" ? "name" : "recent";

  /** 주소만 바꾼다. 서버는 부르지 않는다 */
  const apply = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      window.history.pushState(null, "", query ? `?${query}` : window.location.pathname);
    },
    [params],
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) map.set(item.category, (map.get(item.category) ?? 0) + 1);
    return map;
  }, [items]);

  /** 고른 카테고리 안에 실제로 있는 세분류만 (있지도 않은 걸 고를 일은 없다) */
  const kinds = useMemo(() => {
    if (!category) return [];
    const found = new Map<string, number>();
    for (const item of items) {
      if (item.category !== category || !item.subcategory) continue;
      found.set(item.subcategory, (found.get(item.subcategory) ?? 0) + 1);
    }
    return kindsOf(category)
      .filter((value) => found.has(value))
      .map((value) => ({ value, count: found.get(value)! }));
  }, [items, category]);

  const colors = useMemo(() => {
    const map = new Map<string, { name: string; hex: string; count: number }>();
    for (const item of items) {
      const found = map.get(item.color_name);
      if (found) found.count += 1;
      else map.set(item.color_name, { name: item.color_name, hex: item.color_hex, count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [items]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = items.filter((item) => {
      if (category && item.category !== category) return false;
      if (kind && item.subcategory !== kind) return false;
      if (color && item.color_name !== color) return false;
      if (!term) return true;
      return [item.name, item.brand, item.subcategory]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(term));
    });

    return sort === "name"
      ? [...list].sort((a, b) => a.name.localeCompare(b.name))
      : [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
  }, [items, category, kind, color, q, sort]);

  return (
    <>
      <p className="-mt-6 mb-8 text-right text-sm text-muted">{shown.length}개</p>

      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="search"
            value={q}
            onChange={(event) => apply({ q: event.target.value || null })}
            placeholder="이름·브랜드·세분류 검색"
            className="field max-w-sm"
            aria-label="옷 검색"
          />
        </div>

        <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => apply({ category: null, kind: null })}
            className={`chip ${category ? "" : "chip-active"}`}
          >
            전체
          </button>
          {SLOT_ORDER.map((slot) => (
            <button
              key={slot}
              type="button"
              // 카테고리를 바꾸면 세분류는 푼다 (상의 세분류가 신발에 남으면 안 된다)
              onClick={() =>
                apply({ category: category === slot ? null : slot, kind: null })
              }
              className={`chip ${category === slot ? "chip-active" : ""}`}
            >
              {CATEGORY_META[slot].label}
              <span className={category === slot ? "text-white/60" : "text-muted"}>
                {counts.get(slot) ?? 0}
              </span>
            </button>
          ))}
        </div>

        {kinds.length > 0 ? (
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1 pl-1">
            <span className="eyebrow shrink-0 pr-1">세분류</span>
            {kinds.map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => apply({ kind: kind === entry.value ? null : entry.value })}
                className={`chip ${kind === entry.value ? "chip-active" : ""}`}
              >
                {entry.value}
                <span className={kind === entry.value ? "text-white/60" : "text-muted"}>
                  {entry.count}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {colors.length > 0 ? (
          <div className="no-scrollbar flex items-center gap-2 overflow-x-auto pb-1">
            <span className="eyebrow shrink-0 pr-1">색상</span>
            {colors.map((entry) => (
              <button
                key={entry.name}
                type="button"
                onClick={() => apply({ color: color === entry.name ? null : entry.name })}
                className={`chip ${color === entry.name ? "chip-active" : ""}`}
              >
                <ColorDot hex={entry.hex} />
                {entry.name}
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
            value={sort}
            onChange={(event) => apply({ sort: event.target.value })}
            className="rounded-lg border border-line bg-paper px-3 py-2 text-base outline-none focus:border-ink"
          >
            <option value="recent">최근 등록순</option>
            <option value="name">이름순</option>
          </select>
        </div>
      </div>

      <div className="mt-10">
        {shown.length === 0 ? (
          <div className="rounded-xl bg-mist px-6 py-20 text-center">
            <p className="display text-3xl text-line">Empty</p>
            <p className="mt-4 text-muted">
              {items.length === 0 ? "아직 등록한 옷이 없습니다." : "조건에 맞는 옷이 없습니다."}
            </p>
            <Link href="/closet/new" className="btn-dark mt-6">
              옷 등록하기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {shown.map((item, index) => (
              <ItemCard key={item.id} item={item} priority={index < 4} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
