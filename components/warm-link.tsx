"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, type ReactNode } from "react";

/**
 * 누르려는 낌새가 보이면 그때 미리 받아오는 링크.
 *
 * 카드나 달력 칸처럼 여러 개가 늘어선 곳은 prefetch 를 켜두면 화면에 보이는
 * 수만큼 서버를 부른다. 그렇다고 끄면 누른 뒤에야 받기 시작해 빈 화면이 보인다.
 * 손이 닿거나 마우스가 올라온 링크 하나만 미리 받아서 둘 다 피한다.
 *
 * 터치는 touchstart 가 click 보다 100~300ms 먼저 오므로 그 사이에 받아둔다.
 */
export function WarmLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const warmed = useRef(false);

  function warm() {
    if (warmed.current) return;
    warmed.current = true;
    router.prefetch(href);
  }

  return (
    <Link
      href={href}
      prefetch={false}
      className={className}
      onPointerEnter={warm}
      onTouchStart={warm}
      onFocus={warm}
    >
      {children}
    </Link>
  );
}
