import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LabBadge } from "@/components/lab-badge";
import { isClaudeConfigured } from "@/lib/claude";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "AI" };

const TOOLS = [
  {
    href: "/ai/outfit",
    en: "Outfit",
    title: "코디 추천받기",
    body: "옷장과 오늘 날씨, 최근에 입은 기록을 같이 보고 조합을 골라 줍니다. 가지고 있는 옷으로만 만듭니다.",
  },
  {
    href: "/ai/size",
    en: "Size",
    title: "살까 말까 사이즈 보기",
    body: "사려는 옷의 실측표 사진을 올리면, 가지고 있는 옷과 견줘서 클지 길지 오버핏일지 알려줍니다.",
  },
] as const;

export default async function AiPage() {
  const [user, configured] = await Promise.all([getUser(), isClaudeConfigured()]);
  if (!user) redirect("/login?next=/ai");

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 lg:px-10">
      <div className="flex items-center gap-3">
        <p className="eyebrow">AI</p>
        <LabBadge />
      </div>
      <h1 className="display mt-2 text-5xl sm:text-6xl">AI에게 물어보기</h1>
      <p className="mt-6 text-muted">
        아직 다듬는 중인 기능입니다. 답이 늘 맞지는 않으니 참고로만 보세요.
      </p>

      {!configured ? (
        <div className="mt-10 rounded-xl bg-mist px-6 py-8">
          <p className="font-semibold">API 키가 필요합니다.</p>
          <p className="mt-2 text-sm text-muted">
            각자 자기 키로 부릅니다. 요금도 각자 내고, 한 사람이 많이 써도 다른 사람이 막히지
            않습니다.
          </p>
          <Link href="/settings" className="btn-dark mt-5">
            설정에서 키 등록
          </Link>
        </div>
      ) : null}

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="group rounded-2xl border border-line p-6 transition-colors hover:border-ink"
          >
            <p className="display text-xs text-line">{tool.en}</p>
            <p className="mt-2 text-lg font-semibold group-hover:underline">{tool.title}</p>
            <p className="mt-3 text-sm leading-relaxed text-muted">{tool.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
