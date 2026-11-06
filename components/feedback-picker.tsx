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
  /** 아이콘 자리 크기 (이모지는 글자 크기, SVG는 h/w) */
  glyphClass: string;
};

/** 늘어놓은 것 중 하나 고르기. 고른 걸 다시 누르면 선택이 풀린다 */
function Picker<T extends string>({
  name,
  values,
  labels,
  defaultValue,
  glyph,
  glyphClass,
}: Props<T>) {
  const [picked, setPicked] = useState<T | null>(defaultValue ?? null);

  return (
    /* 칸 너비를 폭에 맞춰 나눈다. 다섯 칸이 폰에서 한 줄에 안 들어가므로
       좁을 때는 세 칸씩 접고, 넓어지면 한 줄로 편다 (순서가 눈금이라 줄바꿈이
       들쭉날쭉하면 안 된다) */
    <div
      className={`grid gap-2 ${
        values.length > 3 ? "grid-cols-3 sm:grid-cols-5" : "grid-cols-3"
      }`}
    >
      {picked ? <input type="hidden" name={name} value={picked} /> : null}
      {values.map((value) => {
        const active = picked === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => setPicked(active ? null : value)}
            className={`flex flex-col items-center gap-2 rounded-xl border px-2 py-4
              text-center transition-colors ${
                active ? "border-ink bg-ink text-paper" : "border-line text-ink hover:border-ink"
              }`}
          >
            {glyph(value, glyphClass)}
            <span className="text-[13px] font-medium leading-tight sm:text-sm">
              {labels[value]}
            </span>
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
      glyphClass="text-3xl"
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
      glyphClass="h-7 w-7"
    />
  );
}
