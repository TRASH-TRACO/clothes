import type { Metadata } from "next";

import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const raw = params.next;
  const next = typeof raw === "string" && raw.startsWith("/") ? raw : "/closet";

  return (
    <div className="grid min-h-[calc(100vh-140px)] lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-ink p-12 text-paper lg:flex">
        <p className="eyebrow text-white/50">Closet</p>
        <div>
          <h1 className="display text-6xl">
            입을 옷은
            <br />
            이미 옷장에
            <br />
            있습니다
          </h1>
          <p className="mt-6 max-w-sm text-white/60">
            기록해두면 보이고, 조합해두면 아침이 빨라집니다.
          </p>
        </div>
        <p className="text-xs text-white/40">사진 · 실측 · 색상 · 코디 저장</p>
      </div>

      <div className="flex items-center justify-center px-6 py-20">
        <AuthForm next={next} />
      </div>
    </div>
  );
}
