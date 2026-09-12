import type { Metadata } from "next";
import Link from "next/link";

import { OutfitCard } from "@/components/outfit-card";
import { getOutfits } from "@/lib/data";

export const metadata: Metadata = { title: "저장한 코디" };

export default async function OutfitsPage() {
  const outfits = await getOutfits();

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Saved looks</p>
          <h1 className="display mt-2 text-5xl sm:text-6xl">저장한 코디</h1>
        </div>
        <Link href="/studio" className="btn-dark">
          새 코디 만들기
        </Link>
      </div>

      {outfits.length === 0 ? (
        <div className="rounded-xl bg-mist px-6 py-20 text-center">
          <p className="display text-3xl text-line">No looks yet</p>
          <p className="mt-4 text-muted">옷장에서 조합해 첫 코디를 저장해보세요.</p>
          <Link href="/studio" className="btn-dark mt-6">
            코디 만들기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {outfits.map((outfit) => (
            <OutfitCard key={outfit.id} outfit={outfit} />
          ))}
        </div>
      )}
    </div>
  );
}
