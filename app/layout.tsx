import type { Metadata, Viewport } from "next";
import { Anton, Black_Han_Sans, Inter } from "next/font/google";

import { SetupNotice } from "@/components/setup-notice";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

/** 한글 헤드라인용. Anton에는 한글 글리프가 없어서 굵은 한글 폰트를 뒤에 둔다. */
const blackHanSans = Black_Han_Sans({
  variable: "--font-black-han-sans",
  weight: "400",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CLOSET — 내 옷장과 코디",
    template: "%s | CLOSET",
  },
  description: "가지고 있는 옷을 사진·실측·색상으로 기록하고, 조합해서 코디를 저장하는 앱.",
  applicationName: "CLOSET",
  // 홈 화면에 추가하면 주소창 없이 뜬다.
  //
  // black-translucent 는 상태바 뒤까지 화면을 채운다. 이미 홈 화면에 추가된
  // 아이콘이 이 값을 저장해 두고 있어서, 바꿔도 재설치 전에는 안 바뀐다.
  // 그래서 되돌리는 대신 이 동작을 전제로 두고, 상태바 자리는 헤더 맨 위의
  // .status-band 로 메운다 (globals.css). 상태바 글씨는 흰색이라 띠도 검정이다.
  appleWebApp: {
    capable: true,
    title: "CLOSET",
    statusBarStyle: "black-translucent",
  },
  // 실측값 숫자를 사파리가 전화번호로 오인해 링크 거는 걸 막는다
  formatDetection: { telephone: false },
  // Next는 표준 이름인 mobile-web-app-capable만 내보낸다.
  // 이 이름을 모르는 구형 iOS에서도 전체화면으로 뜨도록 애플 접두사 버전을 같이 넣는다.
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  // 노치·홈 인디케이터 영역까지 그린 뒤 env(safe-area-inset-*)로 여백을 잡는다
  viewportFit: "cover",
};

/** 모든 화면이 로그인한 사용자의 데이터를 보여주므로 정적 생성하지 않는다. */
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  // globals.css 의 scroll-behavior: smooth 를 Next가 화면 이동 때만 잠깐 끄게 하는 표시.
  // Next 16부터는 이게 없으면 안 꺼줘서, 부드럽게 올라가다 중간에 멈춘다.
  return (
    <html
      lang="ko"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${anton.variable} ${blackHanSans.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-paper text-ink">
        {/* 상태바가 화면을 덮는지 그릴 때 바로 판정한다.
            iOS 전체화면에서 env(safe-area-inset-top) 이 0으로 오는 경우가 있어
            CSS 만으로는 알 수 없었다. 덮는 모드에서는 화면 높이가 기기 높이와
            같고, 안 덮으면 상태바만큼 작다. 첫 페인트 전에 돌아야 하므로 인라인. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{if(navigator.standalone===true&&window.innerHeight>=screen.height-2)' +
              'document.documentElement.setAttribute("data-status-overlay","")}catch(e){}',
          }}
        />
        <SiteHeader />
        <main className="flex-1">{isSupabaseConfigured() ? children : <SetupNotice />}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
