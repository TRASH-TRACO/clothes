"use client";

import { createBrowserClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

let cached: ReturnType<typeof createBrowserClient> | null = null;

/** 브라우저용 Supabase 클라이언트 (사진 업로드, 로그인 상태 구독 등) */
export function createClient() {
  cached ??= createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return cached;
}
