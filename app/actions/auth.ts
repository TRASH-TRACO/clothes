"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

function readCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/closet");
  return { email, password, next: next.startsWith("/") ? next : "/closet" };
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { email, password, next } = readCredentials(formData);
  if (!email || !password) return { ok: false, message: "이메일과 비밀번호를 입력하세요." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: "로그인에 실패했습니다. 이메일과 비밀번호를 확인하세요." };

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { email, password, next } = readCredentials(formData);
  if (!email || !password) return { ok: false, message: "이메일과 비밀번호를 입력하세요." };
  if (password.length < 6) return { ok: false, message: "비밀번호는 6자 이상이어야 합니다." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, message: error.message };

  // 이메일 인증이 켜져 있으면 세션이 없다.
  if (!data.session) {
    return { ok: true, message: "가입 확인 메일을 보냈습니다. 메일함을 확인하세요." };
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
