import type { NextConfig } from "next";

/** Supabase Storage 공개 URL을 next/image가 최적화할 수 있게 허용한다. */
function supabaseHostname() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "*.supabase.co";
  try {
    return new URL(url).hostname;
  } catch {
    return "*.supabase.co";
  }
}

const nextConfig: NextConfig = {
  experimental: {
    /**
     * 클라이언트 라우터 캐시. dynamic 기본값이 0초라 화면을 옮길 때마다
     * 서버에서 다시 받아온다. 잠깐 사이에 왔다 갔다 하는 건 그대로 재사용한다.
     *
     * 내가 고친 내용은 서버 액션의 revalidatePath 가 이 캐시도 비우므로
     * 저장 직후에는 늘 새 값이 보인다. 앱으로 돌아올 때도 새로 받는다
     * (components/app-refresh.tsx).
     */
    staleTimes: { dynamic: 60 },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname(),
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
