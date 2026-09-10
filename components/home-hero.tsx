import Link from "next/link";
import type { ReactNode } from "react";

/** 홈 맨 위. 로그인한 사람에겐 헤드라인 옆에 날씨가 붙는다 */
export function HomeHero({ signedIn, aside }: { signedIn: boolean; aside?: ReactNode }) {
  return (
    <section className="relative overflow-hidden bg-mist">
      {/* 날씨가 붙으면 헤드라인 옆에 세우고 위아래를 줄인다 (스크롤 없이 보이게) */}
      <div
        className={
          aside
            ? "mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:items-center lg:gap-16 lg:px-10 lg:py-20"
            : "mx-auto flex max-w-7xl flex-col gap-8 px-6 py-24 lg:px-10 lg:py-32"
        }
      >
        <div className="flex flex-col gap-8">
          <p className="eyebrow">Your closet, organized</p>
          <h1 className="display text-6xl sm:text-7xl lg:text-8xl">
            오늘 뭐 입지
            <br />
            고민 끝
          </h1>
          {/* 로그인한 사람에겐 소개 문구가 필요 없다. 그만큼 날씨가 위로 올라온다 */}
          {!signedIn && (
            <p className="max-w-xl text-lg text-muted">
              사진과 실측, 색상까지 옷 하나하나 기록하고 모자·상의·하의·신발을 한 화면에서
              조합하세요. 마음에 든 조합은 그대로 저장됩니다.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <Link href={signedIn ? "/closet/new" : "/login"} className="btn-dark">
              {signedIn ? "옷 등록하기" : "시작하기"}
            </Link>
            <Link href={signedIn ? "/studio" : "/login"} className="btn-light">
              코디 만들기
            </Link>
          </div>
        </div>

        {aside}
      </div>
    </section>
  );
}
