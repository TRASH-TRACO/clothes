import Link from "next/link";

import { signOut } from "@/app/actions/auth";
import { AppRefresh } from "@/components/app-refresh";
import { NavLinks } from "@/components/nav-links";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUser } from "@/lib/supabase/server";

export async function SiteHeader() {
  const user = isSupabaseConfigured() ? await getUser() : null;

  return (
    <header className="sticky top-0 z-40 bg-paper">
      {/* 상태바가 덮는 자리를 검게 메운다. 높이 규칙은 globals.css 의 .status-band */}
      <div className="status-band" />

      <div className="flex h-16 items-center justify-between gap-6 border-b border-line px-4 sm:px-6 lg:px-10">
        <Link href="/" className="display text-2xl leading-none">
          Closet
        </Link>

        <NavLinks className="hidden items-center gap-8 md:flex" />

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                href="/settings"
                className="hidden max-w-[180px] truncate text-sm text-muted hover:text-ink lg:inline"
                title="설정"
              >
                {user.email}
              </Link>
              <AppRefresh />
              <Link href="/closet/new" className="btn-dark px-5 py-2.5">
                옷 등록
              </Link>
              <form action={signOut}>
                <button type="submit" className="text-sm text-muted hover:text-ink">
                  로그아웃
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn-dark px-5 py-2.5">
              시작하기
            </Link>
          )}
        </div>
      </div>

      <NavLinks className="flex items-center gap-6 overflow-x-auto border-b border-line px-4 py-3 md:hidden no-scrollbar" />
    </header>
  );
}
