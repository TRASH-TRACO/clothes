"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useSyncExternalStore, useTransition } from "react";

/** 돌아올 때마다 부르면 과하다. 이 간격 안에 다시 오면 건너뛴다 */
const MIN_GAP_MS = 30_000;

const MEDIA = "(display-mode: standalone)";

function subscribeStandalone(onChange: () => void) {
  const query = window.matchMedia(MEDIA);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** 안드로이드·데스크톱은 display-mode, iOS는 navigator.standalone 으로 알 수 있다 */
function isStandalone() {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia(MEDIA).matches || nav.standalone === true;
}

/**
 * 홈 화면에서 띄우면 주소창이 없어 새로고침할 방법이 마땅치 않다.
 *
 * - 앱으로 돌아오면 알아서 최신으로 맞춘다 (서버 컴포넌트만 다시 받는다)
 * - 전체화면으로 실행 중일 때만 새로고침 버튼을 보여준다
 *   (브라우저로 열었으면 주소창의 새로고침이 이미 있다)
 */
export function AppRefresh({ className = "" }: { className?: string }) {
  const router = useRouter();
  // 서버에서는 알 수 없으므로 false로 그렸다가 물이 오른 뒤 다시 판단한다
  const standalone = useSyncExternalStore(subscribeStandalone, isStandalone, () => false);
  const [pending, startTransition] = useTransition();
  const lastRun = useRef(0);

  const refresh = useCallback(
    (force = false) => {
      const now = Date.now();
      if (!force && now - lastRun.current < MIN_GAP_MS) return;
      lastRun.current = now;
      startTransition(() => router.refresh());
    },
    [router],
  );

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh]);

  if (!standalone) return null;

  return (
    <button
      type="button"
      onClick={() => refresh(true)}
      disabled={pending}
      aria-label="새로고침"
      title="새로고침"
      className={`text-muted transition-colors hover:text-ink disabled:opacity-40 ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={`h-5 w-5 ${pending ? "animate-spin" : ""}`}
      >
        <path d="M20 12a8 8 0 1 1-2.6-5.9" />
        <path d="M20 4v4.5h-4.5" />
      </svg>
    </button>
  );
}
