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
  // black-translucent 만 상태바 뒤까지 화면을 채운다. iOS 전체화면에서는
  // env(safe-area-inset-top) 이 0으로 와서 밀어줄 수가 없으니 쓰지 않는다.
  // default 는 상태바 아래에서 화면이 시작하고 글씨가 검정이라, 흰 헤더와 이어진다.
  //
  // 주의: iOS 는 이 값을 홈 화면에 추가할 때 저장한다. 바꿔도 이미 깔린 아이콘은
  // 예전 값을 그대로 쓰므로, 아이콘을 지우고 다시 추가해야 반영된다.
  appleWebApp: {
    capable: true,
    title: "CLOSET",
    statusBarStyle: "default",
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
        <SiteHeader />
        <main className="flex-1">{isSupabaseConfigured() ? children : <SetupNotice />}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
