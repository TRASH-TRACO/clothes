import type { Metadata } from "next";
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
};

/** 모든 화면이 로그인한 사용자의 데이터를 보여주므로 정적 생성하지 않는다. */
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${inter.variable} ${anton.variable} ${blackHanSans.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <SiteHeader />
        <main className="flex-1">{isSupabaseConfigured() ? children : <SetupNotice />}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
