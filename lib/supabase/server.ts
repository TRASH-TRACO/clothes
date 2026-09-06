import "server-only";

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

/** 로그인한 사용자. 없으면 null (환경변수 미설정 시에도 null) */
export async function getUser() {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    // Supabase에 닿지 못하면 로그아웃 상태로 취급한다 (헤더까지 500이 나지 않도록)
    return null;
  }
}
