import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteOutfit } from "@/app/actions/outfits";
import { ConfirmForm } from "@/components/confirm-form";
import { RatingGlyph } from "@/components/feedback-glyph";
import { ColorDot } from "@/components/color-dot";
import { ItemPhoto } from "@/components/item-photo";
import { PhotoCarousel } from "@/components/photo-carousel";
import { RATING_LABELS } from "@/lib/feedback";
import { CATEGORY_META, formatMeasurements } from "@/lib/categories";
import { outfitTitle } from "@/lib/outfit-title";
import { outfitPhotos } from "@/lib/photos";
import { getOutfit, getOutfitFolders } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/outfits/[id]">): Promise<Metadata> {
  const { id } = await params;
  const outfit = await getOutfit(id);
  if (!outfit) return { title: "코디" };
  return {
    title: outfitTitle(
      outfit.name,
      outfit.items.map((entry) => entry.item?.name).filter((name) => Boolean(name)) as string[],
    ),
  };
}

export default async function OutfitPage({ params }: PageProps<"/outfits/[id]">) {
  const { id } = await params;
  const outfit = await getOutfit(id);
  if (!outfit) notFound();

  const entries = outfit.items.filter((entry) => entry.item !== null);
  const title = outfitTitle(outfit.name, entries.map((entry) => entry.item!.name));
  const photos = outfitPhotos(outfit);
  // 어느 폴더에 있는지. 폴더 기능을 안 쓰는 사람에게는 아무것도 안 보인다.
  const folder = (await getOutfitFolders()).find((entry) => entry.id === outfit.folder_id) ?? null;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
      <Link href="/outfits" className="text-sm text-muted underline underline-offset-4">
        ← 저장한 코디
      </Link>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{folder ? folder.name : "Look"}</p>
          <h1 className="display mt-2 text-5xl sm:text-6xl">{title}</h1>
          {outfit.rating ? (
            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-mist px-4 py-2 text-sm font-medium">
              <RatingGlyph value={outfit.rating} className="h-5 w-5" />
              {RATING_LABELS[outfit.rating]}
            </p>
          ) : null}
          {outfit.memo ? <p className="mt-4 max-w-xl text-muted">{outfit.memo}</p> : null}
        </div>
        <div className="flex items-center gap-4">
          <Link href={`/studio?edit=${outfit.id}`} className="btn-dark">
            수정하기
          </Link>
          <ConfirmForm
            action={deleteOutfit}
            hidden={{ id: outfit.id }}
            label="삭제"
            triggerClassName="text-sm text-muted underline underline-offset-4 hover:text-accent"
            title={`${title}, 지울까요?`}
            body="코디만 사라지고 옷은 그대로 남습니다. 이 코디로 남긴 지난 착용 기록도 그대로입니다 (기록은 옷을 복사해 두기 때문입니다)."
            confirmLabel="삭제"
          />
        </div>
      </div>

      {photos.length > 0 ? (
        <div className="mt-10 max-w-md">
          <p className="eyebrow mb-3">
            착장 사진{photos.length > 1 ? ` ${photos.length}장` : ""}
          </p>
          {/* 여러 장이면 옆으로 밀어 넘긴다 (옷 상세와 같은 것) */}
          <PhotoCarousel
            paths={photos}
            alt={`${title} 착장 사진`}
            aspect="aspect-[3/4]"
          />
        </div>
      ) : null}

      <p className="eyebrow mt-12">이 코디의 옷</p>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
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
