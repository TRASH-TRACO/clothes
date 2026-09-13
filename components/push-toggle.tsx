"use client";

import { useEffect, useState } from "react";

import { subscribePush, unsubscribePush } from "@/app/actions/push";

/**
 * 저녁 알림을 이 기기에서 켤지.
 *
 * 알림 허락은 **기기마다** 따로다. 폰에서 켠다고 노트북에서도 오는 게 아니라서,
 * 켜져 있는지는 서버가 아니라 이 브라우저에 물어본다.
 *
 * 아이폰은 **홈 화면에 추가한 뒤에야** 알림을 쓸 수 있다 (iOS 16.4+). 사파리
 * 탭에서는 PushManager 자체가 없어서 아래 지원 검사에 걸린다.
 */
type State = "checking" | "unsupported" | "denied" | "off" | "on" | "working";

export function PushToggle({ publicKey }: { publicKey: string }) {
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (
        typeof window === "undefined" ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        if (alive) setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (alive) setState("denied");
        return;
      }
      try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const existing = await registration?.pushManager.getSubscription();
        if (alive) setState(existing ? "on" : "off");
      } catch {
        if (alive) setState("off");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function turnOn() {
    setState("working");
    setMessage(null);
    try {
      // 허락은 반드시 누른 직후에 물어야 한다. 시간이 지나면 브라우저가 무시한다.
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        // 안 보이는 알림은 못 쓴다 (브라우저가 막는다). 어차피 보여줄 목적이다.
        userVisibleOnly: true,
        applicationServerKey: decodeKey(publicKey),
      });

      const json = subscription.toJSON();
      const result = await subscribePush({
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
      });
      if (!result.ok) {
        // 서버가 못 받았으면 이 기기의 구독도 되돌린다. 안 그러면 켜진 척만 한다.
        await subscription.unsubscribe().catch(() => {});
        setState("off");
        setMessage("등록하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
        return;
      }
      setState("on");
      setMessage("이제 저녁 6시에 알려드릴게요.");
    } catch {
      setState("off");
      setMessage("알림을 켜지 못했습니다.");
    }
  }

  async function turnOff() {
    setState("working");
    setMessage(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await unsubscribePush(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("off");
      setMessage("이 기기에는 더 보내지 않습니다.");
    } catch {
      setState("on");
      setMessage("끄지 못했습니다.");
    }
  }

  if (state === "checking") {
    return <p className="text-sm text-muted">확인하는 중…</p>;
  }

  if (state === "unsupported") {
    return (
      <p className="rounded-xl bg-mist px-5 py-4 text-sm text-muted">
        이 브라우저에서는 알림을 켤 수 없습니다.
        <span className="mt-1 block">
          아이폰은 <span className="font-medium text-ink">홈 화면에 추가</span>한 뒤 그 아이콘으로
          열어야 알림을 쓸 수 있습니다 (iOS 16.4 이상).
        </span>
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="rounded-xl bg-mist px-5 py-4 text-sm text-muted">
        알림이 차단돼 있습니다. 기기 설정에서 이 앱의 알림을 허용한 뒤 다시 와 주세요.
      </p>
    );
  }

  const on = state === "on";
  const busy = state === "working";

  return (
    <div>
      <button
        type="button"
        onClick={on ? turnOff : turnOn}
        disabled={busy}
        className={on ? "btn-light" : "btn-dark"}
      >
        {busy ? "잠시만요…" : on ? "이 기기 알림 끄기" : "이 기기에서 알림 받기"}
      </button>
      {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
    </div>
  );
}

/**
 * 공개 키는 base64url 글자인데 브라우저는 바이트를 달라고 한다.
 * (`-` `_` 를 되돌리고 `=` 를 채워 넣은 뒤 푼다)
 */
function decodeKey(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
