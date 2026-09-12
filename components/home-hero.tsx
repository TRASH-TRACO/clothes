import Link from "next/link";
import type { ReactNode } from "react";

import { ClosetRail } from "@/components/closet-rail";
import { ClosetWave } from "@/components/closet-wave";
import type { Item } from "@/lib/types";

/** 홈 맨 위. 로그인한 사람에겐 헤드라인 옆에 날씨가 붙는다 */
type Props = {
  signedIn: boolean;
  aside?: ReactNode;
  /** 헤드라인 뒤 배경에 쓸 옷들 (사진 있는 것만 쓴다) */
  waveItems?: Item[];
};

export function HomeHero({ signedIn, aside, waveItems = [] }: Props) {
  return (
    <section className="relative overflow-hidden bg-mist">
      {/* 넓은 화면은 물결, 좁은 화면은 옷걸이 */}
      <ClosetWave items={waveItems} />
      <ClosetRail items={waveItems} />

      {/* 날씨가 붙으면 헤드라인 옆에 세우고 위아래를 줄인다 (스크롤 없이 보이게) */}
      <div
        className={
          aside
            ? "relative mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] lg:items-center lg:gap-16 lg:px-10 lg:py-20"
            : "relative mx-auto flex max-w-7xl flex-col gap-8 px-6 py-24 lg:px-10 lg:py-32"
        }
      >
        <div className="flex flex-col gap-8">
          <p className="eyebrow">Your closet, organized</p>
          {/* 줄바꿈을 고정하므로 글자 크기는 가장 긴 줄이 넘치지 않는 선에서 잡는다 */}
          <h1 className="display text-[2.75rem] sm:text-6xl lg:text-7xl">
            오늘은
            <br />
            뭐 입어볼까요?
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
            <Link href={signedIn ? "/recommend" : "/login"} className="btn-light">
              뭐 입을지 물어보기
            </Link>
          </div>
        </div>

        {aside}
      </div>
    </section>
  );
}
