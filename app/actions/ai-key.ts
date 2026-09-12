"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";

import { encryptSecret, hasAppSecret, maskSecret } from "@/lib/secret";
import { createClient, getUser } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

function fail(message: string): ActionState {
  return { ok: false, message };
}

/**
 * 회원이 자기 Anthropic API 키를 맡긴다.
 *
 * 넣기 전에 한 번 써 본다. 오타 난 키를 그대로 저장해 두면
 * 나중에 추천을 누를 때가 돼서야 실패하고, 원인도 알기 어렵다.
 * 모델 목록 조회는 토큰을 쓰지 않으므로 확인 비용이 들지 않는다.
 */
export async function saveClaudeKey(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!hasAppSecret()) {
    return fail("서버에 APP_SECRET 이 없어 키를 안전하게 보관할 수 없습니다.");
  }

  const key = String(formData.get("api_key") ?? "").trim();
  if (!key) return fail("키를 입력하세요.");
  if (!key.startsWith("sk-ant-") || key.length < 40 || key.length > 300) {
    return fail("Anthropic 키 형식이 아닙니다 (sk-ant- 로 시작합니다).");
  }

  const user = await getUser();
  if (!user) return fail("로그인이 필요합니다.");

  try {
    await new Anthropic({ apiKey: key, maxRetries: 0 }).models.list({ limit: 1 });
  } catch (cause) {
    if (cause instanceof Anthropic.AuthenticationError) return fail("키가 맞지 않습니다.");
    if (cause instanceof Anthropic.PermissionDeniedError) {
      return fail("이 키로는 API를 쓸 수 없습니다. 권한을 확인해주세요.");
    }
    // 키 자체는 로그에 남기지 않는다
    console.error("[ai-key] 확인 실패:", cause instanceof Error ? cause.message : cause);
    return fail("키를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      anthropic_key_cipher: encryptSecret(key),
      anthropic_key_hint: maskSecret(key),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return fail(error.message);

  revalidatePath("/", "layout");
  return { ok: true, message: "키를 저장했습니다. 이제 AI 추천을 쓸 수 있습니다." };
}

export async function deleteClaudeKey(): Promise<void> {
  const user = await getUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase
    .from("user_settings")
    .update({ anthropic_key_cipher: null, anthropic_key_hint: null })
    .eq("user_id", user.id);

  revalidatePath("/", "layout");
}
