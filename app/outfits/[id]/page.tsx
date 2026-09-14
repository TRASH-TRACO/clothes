import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteOutfit } from "@/app/actions/outfits";
import { ConfirmForm } from "@/components/confirm-form";
import { RatingGlyph } from "@/components/feedback-glyph";
import { ItemCard } from "@/components/item-card";
import { PhotoCarousel } from "@/components/photo-carousel";
import { RATING_LABELS } from "@/lib/feedback";
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
      {/* 옷장 목록과 같은 카드를 쓴다. 실측은 "📏 실측" 표시와 부위별 사이즈감만 보이고
          숫자는 안 나온다 — 숫자는 옷 상세에서 볼 값이지 여기서 훑을 값이 아니다.
          같은 카드를 쓰니 옷장에서 보던 것과 같은 자리에 같은 정보가 있다. */}
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
        {entries.map(({ slot, item }) => (
          <ItemCard key={slot} item={item!} />
        ))}
      </div>
    </div>
  );
}
