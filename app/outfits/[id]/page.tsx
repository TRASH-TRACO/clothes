import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteOutfit } from "@/app/actions/outfits";
import { ColorDot } from "@/components/color-dot";
import { ItemPhoto } from "@/components/item-photo";
import { CATEGORY_META, formatMeasurements } from "@/lib/categories";
import { getOutfit } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/outfits/[id]">): Promise<Metadata> {
  const { id } = await params;
  const outfit = await getOutfit(id);
  return { title: outfit?.name ?? "코디" };
}

export default async function OutfitPage({ params }: PageProps<"/outfits/[id]">) {
  const { id } = await params;
  const outfit = await getOutfit(id);
  if (!outfit) notFound();

  const entries = outfit.items.filter((entry) => entry.item !== null);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
      <Link href="/outfits" className="text-sm text-muted underline underline-offset-4">
        ← 저장한 코디
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Look</p>
          <h1 className="display mt-2 text-5xl sm:text-6xl">{outfit.name}</h1>
          {outfit.memo ? <p className="mt-4 max-w-xl text-muted">{outfit.memo}</p> : null}
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/studio?edit=${outfit.id}`} className="btn-dark">
            수정하기
          </Link>
          <form action={deleteOutfit}>
            <input type="hidden" name="id" value={outfit.id} />
            <button
              type="submit"
              className="text-sm text-muted underline underline-offset-4 hover:text-accent"
            >
              삭제
            </button>
          </form>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
        {entries.map(({ slot, item }) => {
          const measurements = formatMeasurements(item!.category, item!.measurements);
          return (
            <Link key={slot} href={`/closet/${item!.id}`} className="group block">
              <p className="eyebrow mb-2">{CATEGORY_META[slot].label}</p>
              <ItemPhoto
                path={item!.photo_path}
                alt={item!.name}
                category={item!.category}
                className="aspect-square rounded-xl"
                sizes="(max-width: 640px) 50vw, 20vw"
              />
              <p className="mt-3 text-sm font-semibold group-hover:underline">{item!.name}</p>
              <p className="flex items-center gap-2 text-sm text-muted">
                <ColorDot hex={item!.color_hex} />
                {item!.color_name}
              </p>
              {measurements ? (
                <p className="mt-1 text-xs text-muted" title={measurements}>
                  {measurements}
                </p>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
