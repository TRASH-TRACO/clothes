import Link from "next/link";
import { Suspense } from "react";

import { HomeHero } from "@/components/home-hero";
import { ItemCard } from "@/components/item-card";
import { OutfitCard } from "@/components/outfit-card";
import { WeatherBand, WeatherBandSkeleton } from "@/components/weather-band";
import { CATEGORY_META, SLOT_ORDER } from "@/lib/categories";
import { getCategoryCounts, getItems, getOutfits } from "@/lib/data";
import { getUser } from "@/lib/supabase/server";

function SectionHeader({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 className="display text-3xl sm:text-4xl">{title}</h2>
      <Link href={href} className="shrink-0 text-sm underline underline-offset-4 hover:text-muted">
        {linkLabel}
      </Link>
    </div>
  );
}

export default async function HomePage() {
  const user = await getUser();

  if (!user) {
    return (
      <>
        <HomeHero signedIn={false} />
        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
          <h2 className="display text-4xl">이렇게 씁니다</h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              { step: "01", title: "옷 등록", body: "사진을 올리고 어깨·가슴·기장 같은 실측과 색상을 남깁니다." },
              { step: "02", title: "조합", body: "모자·아우터·상의·하의·신발 슬롯을 채우면 한 화면에서 확인됩니다." },
              { step: "03", title: "저장", body: "마음에 드는 코디는 이름을 붙여 저장하고 언제든 다시 꺼내 봅니다." },
            ].map((card) => (
              <li key={card.step} className="border-t-2 border-ink pt-4">
                <p className="display text-5xl text-line">{card.step}</p>
                <h3 className="mt-4 text-lg font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm text-muted">{card.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </>
    );
  }

  const [items, outfits, counts] = await Promise.all([
    getItems({ sort: "recent" }),
    getOutfits(),
    getCategoryCounts(),
  ]);

  return (
    <>
      <HomeHero
        signedIn
        waveItems={items}
        aside={
          // 날씨는 외부 API라 느릴 수 있다. 옷장 내용이 먼저 뜨도록 떼어둔다
          <Suspense fallback={<WeatherBandSkeleton />}>
            <WeatherBand />
          </Suspense>
        }
      />

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
        <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-line sm:grid-cols-6">
          {SLOT_ORDER.map((slot) => (
            <Link
              key={slot}
              href={`/closet?category=${slot}`}
              className="bg-paper px-4 py-6 text-center transition-colors hover:bg-mist"
            >
              <p className="display text-3xl">{counts[slot]}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-muted">
                {CATEGORY_META[slot].label}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16 lg:px-10">
        <SectionHeader title="최근 등록한 옷" href="/closet" linkLabel="옷장 전체 보기" />
        {items.length === 0 ? (
          <p className="rounded-xl bg-mist px-6 py-12 text-center text-muted">
            아직 등록한 옷이 없습니다.{" "}
            <Link href="/closet/new" className="underline underline-offset-4">
              첫 옷 등록하기
            </Link>
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
            {items.slice(0, 8).map((item, index) => (
              <ItemCard key={item.id} item={item} priority={index < 4} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-8 lg:px-10">
        <SectionHeader title="저장한 코디" href="/outfits" linkLabel="코디 전체 보기" />
        {outfits.length === 0 ? (
          <p className="rounded-xl bg-mist px-6 py-12 text-center text-muted">
            저장한 코디가 없습니다.{" "}
            <Link href="/studio" className="underline underline-offset-4">
              코디 만들러 가기
            </Link>
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {outfits.slice(0, 3).map((outfit) => (
              <OutfitCard key={outfit.id} outfit={outfit} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
