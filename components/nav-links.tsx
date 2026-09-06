"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/closet", label: "옷장" },
  { href: "/studio", label: "코디 만들기" },
  { href: "/outfits", label: "저장한 코디" },
];

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
            {active ? (
              <span className="absolute -bottom-0.5 left-0 h-0.5 w-full bg-ink" aria-hidden />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
