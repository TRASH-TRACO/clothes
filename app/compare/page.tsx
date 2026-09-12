import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CompareView } from "@/components/compare-view";
import { getItems } from "@/lib/data";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "실측 비교" };

export default async function ComparePage({ searchParams }: PageProps<"/compare">) {
  const params = await searchParams;
  const [user, items] = await Promise.all([getUser(), getItems({ sort: "recent", include: "all" })]);
  if (!user) redirect("/login?next=/compare");

  const pick = (key: string) => (typeof params[key] === "string" ? params[key] : null);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 lg:px-10">
      <p className="eyebrow">Compare</p>
      <h1 className="display mt-2 text-5xl sm:text-6xl">실측 비교</h1>
      <p className="mt-6 text-muted">
        가지고 있는 옷과 견줘 보고 사이즈를 고르세요. 기장이 몇 cm 차이 나는지 바로 나옵니다.
        <span className="block">보관함에 넣은 옷도 여기서는 고를 수 있습니다.</span>
      </p>

      <div className="mt-10">
        {items.length < 2 ? (
          <div className="rounded-xl bg-mist px-6 py-20 text-center">
            <p className="display text-3xl text-line">Need two</p>
            <p className="mt-4 text-muted">견주려면 옷이 두 벌 이상 있어야 합니다.</p>
            <Link href="/closet/new" className="btn-dark mt-6">
              옷 등록하기
            </Link>
          </div>
        ) : (
          <CompareView items={items} initialA={pick("a")} initialB={pick("b")} />
        )}
      </div>
    </div>
  );
}
