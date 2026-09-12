"use client";

import { useActionState } from "react";

import { deleteClaudeKey, saveClaudeKey } from "@/app/actions/ai-key";
import type { ActionState } from "@/lib/types";

/**
 * 자기 Anthropic API 키를 맡기는 칸.
 *
 * 저장한 키는 다시 보여주지 않는다 (꼬리 네 자리만). 화면으로 내보낼 이유가 없고,
 * 내보내지 않으면 새어 나갈 자리도 줄어든다.
 */
export function AiKeyForm({ hint }: { hint: string | null }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveClaudeKey, null);

  if (hint) {
    return (
      <div>
        <p className="flex flex-wrap items-center gap-3 text-sm">
          <span className="rounded-lg bg-mist px-3 py-2 font-mono">{hint}</span>
          <span className="text-muted">등록되어 있습니다.</span>
        </p>
        <form action={deleteClaudeKey} className="mt-4">
          <button type="submit" className="btn-light px-5 py-2.5 text-sm">
            키 지우기
          </button>
        </form>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="api_key">
          Anthropic API 키
        </label>
        <input
          id="api_key"
          name="api_key"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="sk-ant-..."
          className="field font-mono"
        />
      </div>

      {state ? (
        <p
          role={state.ok ? undefined : "alert"}
          className={`text-sm font-medium ${state.ok ? "text-ink" : "text-accent"}`}
        >
          {state.message}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className="btn-dark px-8 py-3">
        {pending ? "확인하는 중…" : "저장"}
      </button>
    </form>
  );
}
