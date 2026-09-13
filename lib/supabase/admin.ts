import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "./env";

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/**
 * RLS 를 지나가는 클라이언트.
 *
 * **로그인한 사람이 없는 일에만 쓴다.** 지금은 저녁 알림 하나뿐이다
 * (app/api/push/daily) — 정해진 시각에 서버 혼자 돌면서 모든 사람의 구독을
 * 읽어야 하는데, 그때는 대신 인증해 줄 세션이 없다.
 *
 * 이 키는 남의 데이터까지 다 읽고 쓴다. 브라우저로 나가는 코드에서는 절대
 * 부르지 않는다 — server-only 가 그걸 컴파일 때 막는다.
 */
export function hasAdminKey() {
  return SUPABASE_URL.length > 0 && SERVICE_ROLE_KEY.length > 0;
}

export function createAdminClient() {
  if (!hasAdminKey()) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY 가 없습니다. 알림을 보내려면 필요합니다.");
  }
  return createSupabaseClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    // 서버에서 한 번 쓰고 버리는 클라이언트라 세션을 남길 이유가 없다
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
