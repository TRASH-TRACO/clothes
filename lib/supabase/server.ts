import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  assertSupabaseConfigured,
  isSupabaseConfigured,
} from "./env";

/**
 * 서버 컴포넌트 / 서버 액션용 클라이언트.
 * 요청마다 새로 만들어야 하므로 캐싱하지 않는다.
 */
export async function createClient() {
  assertSupabaseConfigured();
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없다. 세션 갱신은 proxy.ts가 담당한다.
        }
      },
    },
  });
}

export type SessionUser = { id: string; email: string | null };

/**
 * 로그인한 사용자. 없으면 null (환경변수 미설정 시에도 null)
 *
 * getUser()는 호출할 때마다 Auth 서버까지 왕복한다(측정값 80~120ms).
 * 이 프로젝트는 ES256 비대칭 키를 쓰므로 getClaims()가 JWKS로 서명을
 * 로컬에서 검증한다 — 쿠키를 그냥 믿는 게 아니라 실제로 검증하는 것이고,
 * JWKS는 auth-js의 모듈 전역 캐시라 요청마다 클라이언트를 새로 만들어도
 * 재사용된다. 만료가 임박하면 getClaims()가 세션 갱신까지 처리한다.
 *
 * cache()는 한 요청 안의 중복 호출을 합친다(레이아웃 헤더 + 페이지 본문).
 * 렌더 스코프 밖(라우트 핸들러)에서는 캐시 없이 그대로 통과하므로
 * 요청 간에 세션이 섞이지 않는다.
 */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims?.sub) return null;
    return { id: data.claims.sub, email: data.claims.email ?? null };
  } catch {
    // Supabase에 닿지 못하면 로그아웃 상태로 취급한다 (헤더까지 500이 나지 않도록)
    return null;
  }
});
