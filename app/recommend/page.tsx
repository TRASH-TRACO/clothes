import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RecommendPanel } from "@/components/recommend-panel";
import { isClaudeConfigured } from "@/lib/claude";
import { getItems } from "@/lib/data";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "AI 추천" };

/** 모델이 생각하는 동안 기다려야 한다. Vercel 기본 제한으로는 모자란다 */
export const maxDuration = 60;

export default async function RecommendPage() {
  const [user, items] = await Promise.all([getUser(), getItems({ sort: "recent" })]);
  if (!user) redirect("/login?next=/recommend");

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 lg:px-10">
      <p className="eyebrow">Ask AI</p>
      <h1 className="display mt-2 text-5xl sm:text-6xl">뭐 입을지 물어보기</h1>
      <p className="mt-6 text-muted">
        등록해 둔 옷과 오늘 날씨, 최근에 입은 기록까지 같이 보고 고릅니다.
        <span className="block">옷장에 있는 옷으로만 조합합니다.</span>
      </p>

      <div className="mt-10">
        {!isClaudeConfigured() ? (
          <div className="rounded-xl bg-mist px-6 py-8">
            <p className="font-semibold">아직 연결되지 않았습니다.</p>
            <p className="mt-2 text-sm text-muted">
              Vercel 환경변수에 <code className="rounded bg-paper px-1.5 py-0.5">ANTHROPIC_API_KEY</code>
              를 넣으면 켜집니다. 키는{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                console.anthropic.com
              </a>
              에서 만듭니다.
            </p>
          </div>
        ) : items.length < 2 ? (
          <div className="rounded-xl bg-mist px-6 py-20 text-center">
            <p className="display text-3xl text-line">No items</p>
            <p className="mt-4 text-muted">먼저 옷을 두 벌 이상 등록해주세요.</p>
            <Link href="/closet/new" className="btn-dark mt-6">
              옷 등록하기
            </Link>
          </div>
        ) : (
          <RecommendPanel items={items} />
        )}
      </div>
    </div>
  );
}
