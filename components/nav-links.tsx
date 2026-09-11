"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/closet", label: "옷장" },
  { href: "/studio", label: "코디 만들기" },
  { href: "/outfits", label: "저장한 코디" },
  { href: "/calendar", label: "캘린더" },
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
            className={`relative py-1 text-sm font-medium transition-colors ${
              active ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {link.label}
            <LinkProgress active={active} />
          </Link>
        );
      })}
    </nav>
  );
}
