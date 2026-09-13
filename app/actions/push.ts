"use server";

import { revalidatePath } from "next/cache";

import { createClient, getUser } from "@/lib/supabase/server";

/** 브라우저가 준 구독 정보 (필요한 것만) */
export type SubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * 이 기기에 알림을 보내도 된다고 등록한다.
 *
 * 구독은 **기기마다** 하나다. 폰과 노트북에서 각각 켜면 두 줄이 된다.
 * 같은 기기에서 다시 켜면 endpoint 가 같아서 덮어쓴다.
 */
export async function subscribePush(input: SubscriptionInput): Promise<{ ok: boolean }> {
  const user = await getUser();
  if (!user) return { ok: false };
  if (!input?.endpoint || !input.p256dh || !input.auth) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: input.endpoint,
      user_id: user.id,
      p256dh: input.p256dh,
      auth: input.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) return { ok: false };
  revalidatePath("/settings");
  return { ok: true };
}

/** 이 기기에는 그만 보낸다 */
export async function unsubscribePush(endpoint: string): Promise<{ ok: boolean }> {
  const user = await getUser();
  if (!user) return { ok: false };

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) return { ok: false };
  revalidatePath("/settings");
  return { ok: true };
}
