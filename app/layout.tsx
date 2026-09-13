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
    /**
     * 켤 때 뜨는 화면.
     *
     * 이게 없으면 iOS 는 앱이 뜰 때까지 빈 화면을 보여준다 (까맣게 보인다).
     * 안드로이드는 매니페스트의 background_color 로 알아서 만들어 주는데 iOS 는 안 해 준다.
     *
     * **기기 크기가 정확히 맞아야 쓴다.** 하나라도 어긋나면 그 기기에서는 그냥 빈 화면이다.
     * 그래서 아이폰 세로 크기를 다 적어 둔다. "확대 보기"를 켜면 같은 기기가 다른
     * 크기를 말하므로 그 크기도 넣는다. 그림은 bin/make-splash.mjs 로 만든다.
     *
     * 그림에는 흰 바탕과 위 검은 띠만 있고 로고가 없다. 크기가 안 맞으면 iOS 가
     * 왼쪽 위에 맞춰 까는데, 화면보다 큰 그림이면 한가운데 있던 로고가 오른쪽
     * 아래로 밀렸다가 아래 #boot 가 뜰 때 가운데로 툭 튄다. 띠는 위에 붙어 있어
     * 안 밀리므로 그대로 두고, 로고는 #boot 한 곳에서만 그린다.
     */
    startupImage: [
      // 16 Pro Max, 17 Pro Max
      { url: "/splash/1320x2868.png", media: "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      // 14/15/16 Pro Max, 15/16 Plus
      { url: "/splash/1290x2796.png", media: "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      // 12/13/14 Pro Max
      { url: "/splash/1284x2778.png", media: "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      // Air
      { url: "/splash/1260x2736.png", media: "(device-width: 420px) and (device-height: 912px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      // 16 Pro, 17
      { url: "/splash/1206x2622.png", media: "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      // 14 Pro, 15, 16, 16e
      { url: "/splash/1179x2556.png", media: "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      // 12, 13, 14
      { url: "/splash/1170x2532.png", media: "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      // X, XS, 11 Pro, 13 mini
      { url: "/splash/1125x2436.png", media: "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      // XS Max, 11 Pro Max
      { url: "/splash/1242x2688.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      // XR, 11
      { url: "/splash/828x1792.png", media: "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      // 6/7/8 Plus
      { url: "/splash/1242x2208.png", media: "(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      // 6/7/8, SE 2/3
      { url: "/splash/750x1334.png", media: "(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      // 12 mini
      { url: "/splash/1080x2340.png", media: "(device-width: 360px) and (device-height: 780px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      // SE 1
      { url: "/splash/640x1136.png", media: "(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" },
      // 확대 보기
      { url: "/splash/960x2079.png", media: "(device-width: 320px) and (device-height: 693px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      // 확대 보기
      { url: "/splash/960x2070.png", media: "(device-width: 320px) and (device-height: 690px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
      // 확대 보기
      { url: "/splash/1080x2400.png", media: "(device-width: 360px) and (device-height: 800px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" },
    ],
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
        {/* 그릴 때 바로 판정해야 하는 두 가지. 첫 페인트 전에 돌아야 하므로 인라인.
            1. data-standalone — 홈 화면에서 띄웠는가. 아래 #boot 를 보일지 정한다.
            2. data-status-overlay — 상태바가 화면을 덮는가. iOS 전체화면에서
               env(safe-area-inset-top) 이 0으로 오는 경우가 있어 CSS 만으로는 알 수
               없었다. 덮는 모드에서는 화면 높이가 기기 높이와 같고, 안 덮으면
               상태바만큼 작다. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var d=document.documentElement,s=navigator.standalone===true;' +
              'if(s||matchMedia("(display-mode: standalone)").matches)' +
              'd.setAttribute("data-standalone","");' +
              'if(s&&window.innerHeight>=screen.height-2)' +
              'd.setAttribute("data-status-overlay","")}catch(e){}',
          }}
        />

        {/* 켤 때 잠깐 덮는 화면.
            iOS 가 startupImage 를 아이콘 만들 때 한 번 읽고 보관해서, 이미 홈 화면에
            있는 아이콘은 지웠다 다시 담기 전까지 그림이 안 바뀐다. 그래서 시작 화면을
            앱 안에도 한 벌 둔다. 이건 HTML 에 들어 있으니 재설치와 상관없이 뜬다.
            없애는 건 CSS 애니메이션이라 (globals.css) 자바스크립트가 죽어도 걷힌다. */}
        <div id="boot" aria-hidden="true">
          {/* next/image 는 자바스크립트를 기다리므로 여기서는 맨 img 를 쓴다 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon-512.png" alt="" width={512} height={512} />
        </div>
        <SiteHeader />
        <main className="flex-1">{isSupabaseConfigured() ? children : <SetupNotice />}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
