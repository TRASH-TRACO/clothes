"use client";

import { useState } from "react";

import { FeltGlyph, RatingGlyph } from "@/components/feedback-glyph";
import {
  FELT_LABELS,
  FELT_VALUES,
  RATING_LABELS,
  RATING_VALUES,
  type Felt,
  type Rating,
} from "@/lib/feedback";

type Props<T extends string> = {
  name: string;
  values: readonly T[];
  labels: Record<T, string>;
  defaultValue?: T | null;
  glyph: (value: T, className: string) => React.ReactNode;
};

/** 셋 중 하나 고르기. 고른 걸 다시 누르면 선택이 풀린다 */
function Picker<T extends string>({ name, values, labels, defaultValue, glyph }: Props<T>) {
  const [picked, setPicked] = useState<T | null>(defaultValue ?? null);

  return (
    <div className="flex flex-wrap gap-3">
      {picked ? <input type="hidden" name={name} value={picked} /> : null}
      {values.map((value) => {
        const active = picked === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => setPicked(active ? null : value)}
            className={`flex min-w-[104px] flex-col items-center gap-2 rounded-xl border px-4 py-4
              transition-colors ${
                active ? "border-ink bg-ink text-paper" : "border-line text-ink hover:border-ink"
              }`}
          >
            {glyph(value, "h-7 w-7")}
            <span className="text-sm font-medium">{labels[value]}</span>
          </button>
        );
      })}
    </div>
  );
}

export function FeltPicker({ defaultValue }: { defaultValue?: Felt | null }) {
  return (
    <Picker
      name="felt"
      values={FELT_VALUES}
      labels={FELT_LABELS}
      defaultValue={defaultValue}
      glyph={(value, className) => <FeltGlyph value={value} className={className} />}
    />
  );
}

export function RatingPicker({ defaultValue }: { defaultValue?: Rating | null }) {
  return (
    <Picker
      name="rating"
      values={RATING_VALUES}
      labels={RATING_LABELS}
      defaultValue={defaultValue}
      glyph={(value, className) => <RatingGlyph value={value} className={className} />}
    />
  );
}
