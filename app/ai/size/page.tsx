import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LabBadge } from "@/components/lab-badge";
import { SizeCompare } from "@/components/size-compare";
import { isClaudeConfigured } from "@/lib/claude";
import { getItems } from "@/lib/data";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "사이즈 보기" };

/** 사진을 읽고 견주는 일이라 오래 걸린다 */
export const maxDuration = 90;

export default async function SizePage() {
  const [user, items, configured] = await Promise.all([
    getUser(),
    getItems({ sort: "recent" }),
    isClaudeConfigured(),
  ]);
  if (!user) redirect("/login?next=/ai/size");

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 lg:px-10">
      <Link href="/ai" className="text-sm text-muted underline underline-offset-4">
        ← AI
      </Link>
      <div className="mt-6 flex items-center gap-3">
        <p className="eyebrow">Size</p>
        <LabBadge />
      </div>
      <h1 className="display mt-2 text-5xl sm:text-6xl">살까 말까</h1>
      <p className="mt-6 text-muted">
        사려는 옷의 실측표를 캡처해서 올리면, 가지고 있는 옷과 견줘서 클지 길지 오버핏일지
        알려줍니다.
        <span className="block">
          기준 옷에 <strong className="font-semibold text-ink">실측과 사이즈감</strong>을 적어 둘수록
          정확해집니다.
        </span>
      </p>

      <div className="mt-10">
        {!configured ? (
          <div className="rounded-xl bg-mist px-6 py-8">
            <p className="font-semibold">API 키가 필요합니다.</p>
            <p className="mt-2 text-sm text-muted">각자 자기 키로 부릅니다.</p>
            <Link href="/settings" className="btn-dark mt-5">
              설정에서 키 등록
            </Link>
          </div>
        ) : (
          <SizeCompare items={items} />
        )}
      </div>
    </div>
  );
}
