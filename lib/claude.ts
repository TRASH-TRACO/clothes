import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { getUserClaudeKey } from "./data";

/**
 * 코디 추천에 쓰는 Claude 클라이언트.
 *
 * 키는 **회원이 맡긴 것이 먼저**다. 각자 자기 키로 쓰면 요금도 각자 내고,
 * 한 사람이 많이 써서 다른 사람이 막히는 일도 없다.
 * 서버 키(ANTHROPIC_API_KEY)는 혼자 쓰거나 시험할 때를 위한 대비책이다.
 */
export async function claudeKey(): Promise<string | null> {
  return (await getUserClaudeKey()) ?? process.env.ANTHROPIC_API_KEY ?? null;
}

export async function isClaudeConfigured() {
  return Boolean(await claudeKey());
}

export function claude(apiKey: string) {
  return new Anthropic({ apiKey });
}

/** 추천에 쓸 모델 */
export const RECOMMEND_MODEL = "claude-opus-5";
