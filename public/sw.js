/**
 * 알림 + 연결이 끊겼을 때 보여줄 화면.
 *
 * **화면을 캐시에 담지 않는다.** 담는 순간 옛 화면이 뜨는 문제를 여기서 쫓게 된다.
 * fetch 는 받되 **화면 이동(navigate)만** 보고, 그마저도 항상 서버에 먼저 묻는다.
 * 서버에 닿지 못해 fetch 가 실패했을 때만 미리 받아 둔 offline.html 을 내준다.
 * 성공한 응답은 손대지 않고 그대로 넘긴다 — 담지도, 꺼내 쓰지도 않는다.
 *
 * 이게 없으면 홈 화면 앱에서 연결이 잠깐 끊겼을 때 사파리의 "This page couldn't
 * load" 가 뜬다. 주소창도 없는 화면에서 Reload 말고는 할 수 있는 게 없다.
 */

/** 연결이 끊겼을 때 보여줄 화면. 이 한 장만 미리 받아 둔다 */
const OFFLINE_URL = "/offline.html";
const CACHE = "closet-offline-v1";

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // 서버가 보낸 게 JSON 이 아니어도 알림은 떠야 한다
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "CLOSET", {
      body: payload.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      // 같은 tag 끼리는 덮어쓴다. 하루치가 밀려서 여러 개 쌓이면 안 된다.
      tag: payload.tag || "closet",
      data: { url: payload.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      // 이미 열려 있으면 새 창을 띄우지 않고 그 창을 쓴다
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});

// 새로 올린 워커가 다음 실행을 기다리지 않게 한다
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        // reload: 사파리가 들고 있던 옛 사본이 아니라 서버에서 새로 받는다
        await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      } catch {
        // 지금 못 받아도 설치는 끝내야 한다. 알림은 이 한 장과 상관없이 돌아간다.
      }
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 예전 이름으로 남은 통은 지운다
      for (const key of await caches.keys()) {
        if (key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  // 화면 이동만 본다. 사진·RSC·API 요청은 건드리지 않는다
  // (Next 의 화면 전환은 mode 가 navigate 가 아니라 여기 안 걸린다)
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    (async () => {
      try {
        // 늘 서버가 먼저다. 받아 온 건 그대로 넘긴다 (담지 않는다)
        return await fetch(event.request);
      } catch {
        const page = await caches.match(OFFLINE_URL);
        // 저 한 장마저 없으면 평소처럼 브라우저 오류 화면이 뜬다
        return page || Response.error();
      }
    })(),
  );
});
