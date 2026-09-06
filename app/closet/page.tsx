import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ClosetFilters } from "@/components/closet-filters";
import { ItemCard } from "@/components/item-card";
import { isCategory } from "@/lib/categories";
import { getCategoryCounts, getColorFacets, getItems } from "@/lib/data";

export const metadata: Metadata = { title: "옷장" };

export default async function ClosetPage({ searchParams }: PageProps<"/closet">) {
  const params = await searchParams;

  const category = isCategory(params.category) ? params.category : undefined;
  const color = typeof params.color === "string" ? params.color : undefined;
  const q = typeof params.q === "string" ? params.q : undefined;
  const sort = params.sort === "name" ? "name" : "recent";

  const [items, colors, counts] = await Promise.all([
    getItems({ category, color, q, sort }),
    getColorFacets(),
    getCategoryCounts(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">My closet</p>
          <h1 className="display mt-2 text-5xl sm:text-6xl">옷장</h1>
        </div>
        <p className="text-sm text-muted">{items.length}개</p>
      </div>

      <Suspense fallback={<div className="h-32" />}>
        <ClosetFilters colors={colors} counts={counts} />
      </Suspense>

      <div className="mt-10">
        {items.length === 0 ? (
          <div className="rounded-xl bg-mist px-6 py-20 text-center">
            <p className="display text-3xl text-line">Empty</p>
            <p className="mt-4 text-muted">조건에 맞는 옷이 없습니다.</p>
            <Link href="/closet/new" className="btn-dark mt-6">
              옷 등록하기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item, index) => (
              <ItemCard key={item.id} item={item} priority={index < 4} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
