import "server-only";

import Anthropic from "@anthropic-ai/sdk";

/**
 * 코디 추천에 쓰는 Claude 클라이언트.
 *
 * 키가 없으면 기능을 감춘다. 없다고 앱이 망가지면 안 된다 —
 * Supabase 설정을 다루는 방식(isSupabaseConfigured)과 같은 태도다.
 */
export function isClaudeConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function claude() {
  return new Anthropic();
}

/** 추천에 쓸 모델 */
export const RECOMMEND_MODEL = "claude-opus-5";
