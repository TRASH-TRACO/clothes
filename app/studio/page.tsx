import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { OutfitBuilder } from "@/components/outfit-builder";
import { CATEGORIES } from "@/lib/categories";
import { outfitKey, type KnownOutfit } from "@/lib/outfit-key";
import { outfitTitle } from "@/lib/outfit-title";
import { getItems, getOutfit, getOutfitFolders, getOutfits } from "@/lib/data";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "코디 만들기" };

export default async function StudioPage({ searchParams }: PageProps<"/studio">) {
  const params = await searchParams;
  const [items, user, outfits, folders] = await Promise.all([
    getItems({ sort: "recent" }),
    getUser(),
    getOutfits(),
    getOutfitFolders(),
  ]);
  if (!user) redirect("/login?next=/studio");

  // 고르는 동안 "이미 있는 조합" 인지 바로 알려주려고 조합만 추려서 넘긴다
  const known: KnownOutfit[] = outfits.map((outfit) => ({
    id: outfit.id,
    // 이름을 안 지은 코디도 "이미 있습니다 — …" 로 부를 이름이 있어야 한다
    name: outfitTitle(
      outfit.name,
      outfit.items.map((entry) => entry.item?.name).filter((name) => Boolean(name)) as string[],
    ),
    key: outfitKey(outfit.items.map((entry) => entry.item?.id)),
  }));

  // ?edit=<outfitId> 로 저장된 코디를 다시 불러와 수정
  const editId = typeof params.edit === "string" ? params.edit : null;
  const editing = editId ? await getOutfit(editId) : null;

  /**
   * 미리 골라 둘 옷. **순서가 그대로 겹쳐 입은 순서**가 된다.
   *
   * - 수정이면 저장해 둔 순서 그대로 (`getOutfit` 이 이미 안에서 겉으로 세워 준다).
   * - `?i=<id>&i=<id>` 로 넘겨도 된다. 분류당 한 벌이 아니라 레이어드도 실린다.
   * - `?top=<id>` 처럼 분류 이름으로 넘기던 예전 주소도 그대로 받는다
   *   (이미 돌아다니는 링크가 있고, 그때는 분류당 한 벌이었다).
   */
  const picks: string[] = [];
  if (editing) {
    for (const entry of editing.items) {
      if (entry.item) picks.push(entry.item.id);
    }
  } else {
    const listed = params.i;
    for (const value of Array.isArray(listed) ? listed : listed ? [listed] : []) {
      if (typeof value === "string" && value) picks.push(value);
    }
    if (picks.length === 0) {
      for (const category of CATEGORIES) {
        const value = params[category];
        if (typeof value === "string") picks.push(value);
      }
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
          userId={user.id}
          initialPicks={picks}
          known={known}
          folders={folders}
          outfit={
            editing
              ? {
                  id: editing.id,
                  name: editing.name,
                  memo: editing.memo,
                  photo_path: editing.photo_path,
                  photo_paths: editing.photo_paths,
                  rating: editing.rating,
                  folder_id: editing.folder_id,
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
