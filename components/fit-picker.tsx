"use client";

import { useState } from "react";

import { FIT_LABELS, FIT_VALUES, type Fit } from "@/lib/feedback";

/**
 * 작다 · 레귤러 · 오버핏 · 크다.
 *
 * 왼쪽에서 오른쪽으로 갈수록 품이 넉넉해지는 순서라, 줄 자체가 눈금 노릇을 한다.
 * 체감·만족도와 달리 아이콘을 안 쓴다 — 네 개 중 둘("레귤러"·"오버핏")은
 * 그릴 그림이 마땅치 않고, 글자가 곧 설명이라 그림이 필요 없다.
 *
 * 고른 걸 다시 누르면 풀린다 (안 적어도 되는 값이다).
 */
export function FitPicker({ defaultValue }: { defaultValue?: Fit | null }) {
  const [picked, setPicked] = useState<Fit | null>(defaultValue ?? null);

  return (
    <div className="grid grid-cols-4 gap-2">
      {picked ? <input type="hidden" name="fit" value={picked} /> : null}
      {FIT_VALUES.map((value) => {
        const active = picked === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => setPicked(active ? null : value)}
            className={`rounded-xl border px-2 py-3 text-sm font-medium transition-colors ${
              active ? "border-ink bg-ink text-paper" : "border-line text-ink hover:border-ink"
            }`}
          >
            {FIT_LABELS[value]}
          </button>
        );
      })}
    </div>
  );
}
