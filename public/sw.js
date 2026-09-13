/**
 * 알림용 서비스 워커.
 *
 * **fetch 는 일부러 안 받는다.** 받는 순간 이 파일이 모든 요청 사이에 끼어들고,
 * 화면이 안 바뀌거나 옛 화면이 뜨는 문제를 여기서 쫓게 된다. 지금 필요한 건
 * 알림뿐이라 알림만 맡는다.
 */

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
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
