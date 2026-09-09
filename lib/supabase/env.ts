export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";

/** 사진을 올릴 Storage 버킷 이름 */
export const PHOTO_BUCKET = "clothes";

/**
 * 환경변수가 아직 없으면 앱을 죽이는 대신 안내 화면을 띄운다.
 * (배포 직후 env 설정 전에도 페이지가 뜨도록)
 */
export function isSupabaseConfigured() {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase 환경변수가 없습니다. .env.local 에 NEXT_PUBLIC_SUPABASE_URL 과 NEXT_PUBLIC_SUPABASE_ANON_KEY 를 설정하세요.",
    );
  }
}

/**
 * Storage 경로 → 앱 내부 URL.
 * 버킷이 private이라 공개 URL이 없다. 인증을 거치는 프록시 라우트로 보낸다.
 * (동기 함수라 클라이언트 컴포넌트에서도 그대로 쓸 수 있다)
 */
export function photoUrl(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `/api/photo/${path.split("/").map(encodeURIComponent).join("/")}`;
}
