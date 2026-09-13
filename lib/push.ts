import "server-only";

import webpush from "web-push";

import type { PushMessage } from "./push-message";

/**
 * 브라우저에 알림을 밀어 넣는 부분.
 *
 * 열쇠 두 개(VAPID)가 한 쌍이다. 공개 키는 브라우저에 주고 (숨길 값이 아니다),
 * 개인 키는 서버에만 둔다. 이 쌍이 바뀌면 이미 켜 둔 구독은 전부 무효가 되므로
 * 한 번 정하면 안 바꾼다.
 *
 *   npx web-push generate-vapid-keys
 */
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY ?? "";
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
/** 보내는 쪽 연락처. 푸시 서비스가 문제 생기면 여기로 연락한다 */
const SUBJECT = process.env.VAPID_SUBJECT ?? "mailto:closet@example.com";

export function hasPushKeys() {
  return PUBLIC_KEY.length > 0 && PRIVATE_KEY.length > 0;
}

/** 브라우저가 구독할 때 필요한 공개 키. 없으면 알림 기능 자체를 숨긴다 */
export function pushPublicKey(): string | null {
  return hasPushKeys() ? PUBLIC_KEY : null;
}

export type StoredSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * 보낸 결과.
 *   sent   — 푸시 서비스가 받았다 (기기에 떴는지까지는 알 수 없다)
 *   gone   — 이 구독은 죽었다. 지워야 한다 (앱을 지웠거나 알림을 껐다)
 *   failed — 이번에만 실패. 다음에 다시 보낸다
 */
export type PushResult = "sent" | "gone" | "failed";

export async function sendPush(
  subscription: StoredSubscription,
  message: PushMessage,
): Promise<PushResult> {
  if (!hasPushKeys()) return "failed";
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(message),
      // 폰이 꺼져 있어도 하루치는 기다려 준다. 그보다 오래된 건 보낼 이유가 없다.
      { TTL: 12 * 60 * 60 },
    );
    return "sent";
  } catch (error) {
    // 404/410 은 "그런 구독 없다" 는 뜻이다. 계속 들고 있어 봐야 매번 실패한다.
    const status = (error as { statusCode?: number }).statusCode;
    return status === 404 || status === 410 ? "gone" : "failed";
  }
}
