"use client";

import { useActionState, useState } from "react";

import { signIn, signUp } from "@/app/actions/auth";
import type { ActionState } from "@/lib/types";

export function AuthForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex gap-6 border-b border-line">
        {(
          [
            ["signin", "로그인"],
            ["signup", "회원가입"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors ${
              mode === value ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form key={mode} action={formAction} className="space-y-5">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="label" htmlFor="email">
            이메일
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="field"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={6}
            className="field"
            placeholder="6자 이상"
          />
        </div>

        {state ? (
          <p
            role="alert"
            className={`text-sm font-medium ${state.ok ? "text-ink" : "text-accent"}`}
          >
            {state.message}
          </p>
        ) : null}

        <button type="submit" disabled={pending} className="btn-dark w-full">
          {pending ? "처리 중…" : mode === "signin" ? "로그인" : "가입하기"}
        </button>
      </form>
    </div>
  );
}
