import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CompareView } from "@/components/compare-view";
import { getCompareLogs, getItems } from "@/lib/data";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "실측 비교" };

export default async function ComparePage({ searchParams }: PageProps<"/compare">) {
  const params = await searchParams;
  const [user, items, history] = await Promise.all([
    getUser(),
    getItems({ sort: "recent", include: "all" }),
    getCompareLogs(),
  ]);
  if (!user) redirect("/login?next=/compare");

  const pick = (key: string) => (typeof params[key] === "string" ? params[key] : null);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 lg:px-10">
      <p className="eyebrow">Compare</p>
      <h1 className="display mt-2 text-5xl sm:text-6xl">실측 비교</h1>
      <p className="mt-6 text-muted">
        가지고 있는 옷과 견줘 보고 사이즈를 고르세요. 기장이 몇 cm 차이 나는지 바로 나옵니다.
        <span className="block">
          아직 안 산 옷은 판매 페이지의 실측을 직접 적어서 견줄 수 있습니다.
        </span>
        <span className="block">보관함에 넣은 옷도 여기서는 고를 수 있습니다.</span>
      </p>

      <div className="mt-10">
        {items.length === 0 ? (
          <div className="rounded-xl bg-mist px-6 py-20 text-center">
            <p className="display text-3xl text-line">Need one</p>
            {/* 새로 살 옷은 직접 적을 수 있으니, 기준이 될 내 옷 한 벌만 있으면 된다 */}
            <p className="mt-4 text-muted">견주려면 기준이 될 내 옷이 한 벌은 있어야 합니다.</p>
            <Link href="/closet/new" className="btn-dark mt-6">
              옷 등록하기
            </Link>
          </div>
        ) : (
          <CompareView
            items={items}
            initialA={pick("a")}
            initialB={pick("b")}
            history={history}
          />
        )}
      </div>
    </div>
  );
}
