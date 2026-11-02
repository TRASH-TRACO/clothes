"use client";

import { useEffect } from "react";

/**
 * 서비스 워커를 켜 둔다.
 *
 * 예전에는 **알림을 켤 때만** 등록했다. 그래서 알림을 안 쓰는 사람에게는 워커가
 * 아예 없었고, 홈 화면 앱에서 연결이 잠깐 끊기면 사파리의 "This page couldn't
 * load" 가 떴다 — 주소창도 없는 화면이라 Reload 말고는 할 수 있는 게 없다.
 *
 * 워커가 하는 일은 알림과, 연결이 끊겼을 때 우리 화면을 대신 보여주는 것뿐이다
 * (public/sw.js). 화면을 캐시에 담지 않으므로 옛 화면이 뜰 일은 없다.
 *
 * 그릴 게 없다. 등록은 몇 번 불러도 같은 하나다.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // 첫 화면이 다 뜬 뒤에 등록한다. 켜자마자 할 일은 아니다
    const id = window.setTimeout(() => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // 사파리 비공개 탭처럼 못 쓰는 곳이 있다. 없어도 앱은 그대로 돈다
      });
    }, 1200);
    return () => window.clearTimeout(id);
  }, []);

  return null;
}
