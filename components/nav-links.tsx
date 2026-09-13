"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

import { LabBadge } from "@/components/lab-badge";

/** AI 는 아직 다듬는 중이라 맨 끝에 두고 실험실 표시를 붙인다 */
const LINKS = [
  { href: "/closet", label: "옷장", lab: false },
  { href: "/studio", label: "코디 만들기", lab: false },
  { href: "/outfits", label: "저장한 코디", lab: false },
  { href: "/calendar", label: "캘린더", lab: false },
  { href: "/ai", label: "AI", lab: true },
];

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
        const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
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
