import Link from "next/link";

export function SiteFooter() {
  // 아래 여백은 아이폰 홈 인디케이터에 가리지 않게 safe-area 를 더한다
  return (
    <footer className="mt-24 bg-ink px-6 pt-12 pb-[calc(3rem+env(safe-area-inset-bottom))] text-paper lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="display text-4xl leading-none">Closet</p>
          <p className="mt-3 max-w-sm text-sm text-white/60">
            사진, 실측, 색상까지 기록하는 내 옷장. 조합해서 저장하면 다음에 고민할 시간이 줄어듭니다.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/70">
          <Link href="/closet" className="hover:text-paper">
            옷장
          </Link>
          <Link href="/closet/new" className="hover:text-paper">
            옷 등록
          </Link>
          <Link href="/studio" className="hover:text-paper">
            코디 만들기
          </Link>
          <Link href="/outfits" className="hover:text-paper">
            저장한 코디
          </Link>
          <Link href="/calendar" className="hover:text-paper">
            캘린더
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-10 max-w-7xl text-xs text-white/40">
        © {new Date().getFullYear()} Closet. 개인 옷장 기록용 프로젝트.
      </p>
    </footer>
  );
}
