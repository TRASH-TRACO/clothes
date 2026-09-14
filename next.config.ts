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
    // 실측표 사진을 서버 액션 본문으로 보낸다 (줄여도 장당 수백 KB)
    serverActions: { bodySizeLimit: "6mb" },
    /**
     * 클라이언트 라우터 캐시. dynamic 기본값이 0초라 화면을 옮길 때마다
     * 서버에서 다시 받아온다. 잠깐 사이에 왔다 갔다 하는 건 그대로 재사용한다.
     *
     * 내가 고친 내용은 서버 액션의 revalidatePath 가 이 캐시도 비우므로
     * 저장 직후에는 늘 새 값이 보인다. 앱으로 돌아올 때도 새로 받는다
     * (components/app-refresh.tsx).
     *
     * 5분인 이유: 달력이 앞뒤 달을 미리 받아 두는데 (components/month-prefetch.tsx)
     * 이 시간이 지나면 받아 둔 게 버려져서 다시 기다리게 된다. 달력을 넘겨 보는
     * 동안은 남아 있어야 한다. 위 두 가지가 낡은 값을 막아 준다.
     */
    staleTimes: { dynamic: 300 },
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
