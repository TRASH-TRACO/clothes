"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

import { LabBadge } from "@/components/lab-badge";

/**
 * AI 는 아직 다듬는 중이라 맨 끝에 두고 실험실 표시를 붙인다.
 *
 * **코디는 한 칸이다.** 예전에는 `코디 만들기`(/studio) 와 `저장한 코디`(/outfits)
 * 가 따로 있었는데, 만들려면 목록을 먼저 보게 되고 목록에는 이미 `새 코디 만들기`
 * 버튼이 있다. 두 칸이 같은 곳을 가리키는 셈이라 하나로 합쳤다.
 * 만드는 중(/studio)에도 이 칸이 눌린 것으로 보여야 한다 — `also` 가 그 몫이다.
 */
const LINKS = [
  { href: "/closet", label: "옷장", lab: false, also: [] as string[] },
  { href: "/outfits", label: "코디", lab: false, also: ["/studio"] },
  { href: "/calendar", label: "캘린더", lab: false, also: [] as string[] },
  { href: "/cart", label: "장바구니", lab: false, also: [] as string[] },
  { href: "/ai", label: "AI", lab: true, also: [] as string[] },
];

/** 이 주소에 있을 때 그 칸이 눌린 것으로 볼지 */
function isActive(pathname: string, href: string, also: string[]) {
  return [href, ...also].some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

/**
 * 누른 링크에 밑줄이 차오르게 한다.
 * 화면이 바뀌기 전 빈 시간을 메워, 눌렸는지 몰라 또 누르는 걸 막는다.
 * (Link 안에서만 쓸 수 있는 훅이다)
 */
function LinkProgress({ active }: { active: boolean }) {
  const { pending } = useLinkStatus();
  if (active) {
    return <span className="absolute -bottom-0.5 left-0 h-0.5 w-full bg-ink" aria-hidden />;
  }
  return (
    <span
      aria-hidden
      className={`absolute -bottom-0.5 left-0 h-0.5 w-full origin-left bg-ink transition-transform
        duration-200 ${pending ? "scale-x-100" : "scale-x-0"}`}
    />
  );
}

export function NavLinks({ className = "" }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav className={className}>
      {LINKS.map((link) => {
        const active = isActive(pathname, link.href, link.also);
        return (
          <Link
            key={link.href}
            href={link.href}
            /* 좁은 화면에서는 줄바꿈 대신 옆으로 밀린다 (바깥이 overflow-x-auto) */
            className={`relative shrink-0 whitespace-nowrap py-1 text-sm font-medium transition-colors ${
              active ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {link.label}
            {link.lab ? <LabBadge className="ml-1.5 align-middle" /> : null}
            <LinkProgress active={active} />
          </Link>
        );
      })}
    </nav>
  );
}
