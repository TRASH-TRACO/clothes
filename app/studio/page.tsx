import type { Metadata } from "next";
import Link from "next/link";

import { OutfitBuilder } from "@/components/outfit-builder";
import { CATEGORIES, type Category } from "@/lib/categories";
import { getItems, getOutfit } from "@/lib/data";

export const metadata: Metadata = { title: "코디 만들기" };

export default async function StudioPage({ searchParams }: PageProps<"/studio">) {
  const params = await searchParams;
  const items = await getItems({ sort: "recent" });

  // ?edit=<outfitId> 로 저장된 코디를 다시 불러와 수정
  const editId = typeof params.edit === "string" ? params.edit : null;
  const editing = editId ? await getOutfit(editId) : null;

  const selection: Partial<Record<Category, string>> = {};
  if (editing) {
    for (const entry of editing.items) {
      if (entry.item) selection[entry.slot] = entry.item.id;
    }
  } else {
    // ?top=<itemId> 처럼 카테고리별로 미리 채워둘 수 있다
    for (const category of CATEGORIES) {
      const value = params[category];
      if (typeof value === "string") selection[category] = value;
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Studio</p>
          <h1 className="display mt-2 text-5xl sm:text-6xl">
            {editing ? "코디 수정" : "코디 만들기"}
          </h1>
        </div>
        <Link href="/outfits" className="text-sm underline underline-offset-4 hover:text-muted">
          저장한 코디 보기
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl bg-mist px-6 py-20 text-center">
          <p className="display text-3xl text-line">No items</p>
          <p className="mt-4 text-muted">먼저 옷을 등록해야 조합할 수 있습니다.</p>
          <Link href="/closet/new" className="btn-dark mt-6">
            옷 등록하기
          </Link>
        </div>
      ) : (
        <OutfitBuilder
          items={items}
          initialSelection={selection}
          outfit={editing ? { id: editing.id, name: editing.name, memo: editing.memo } : undefined}
        />
      )}
    </div>
  );
}
