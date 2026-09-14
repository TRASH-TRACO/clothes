"use client";

import { useState } from "react";

import { fitAxisOf, type MeasurementField } from "@/lib/categories";
import { PART_FIT_BY_AXIS, PART_FIT_LABELS, type PartFit } from "@/lib/feedback";

/**
 * 부위별로 어땠는지. 기장은 길다/짧다, 품은 크다/작다만 뜬다 —
 * 어깨가 "길다" 고는 안 하니까 아예 안 보여준다.
 *
 * 딱 맞았으면 아무것도 안 고르면 된다. 고른 걸 다시 누르면 풀린다.
 */
export function PartFitPicker({
  fields,
  defaultValues,
}: {
  fields: MeasurementField[];
  defaultValues: Record<string, PartFit>;
}) {
  const [picked, setPicked] = useState<Record<string, PartFit>>(defaultValues);

  function toggle(key: string, value: PartFit) {
    setPicked((prev) => {
      const next = { ...prev };
      if (next[key] === value) delete next[key];
      else next[key] = value;
      return next;
    });
  }

  return (
    <div className="space-y-2">
      {fields.map((field) => {
        const options = PART_FIT_BY_AXIS[fitAxisOf(field)];
        const value = picked[field.key];
        return (
          <div key={field.key} className="flex items-center justify-between gap-3">
            {value ? <input type="hidden" name={`pf_${field.key}`} value={value} /> : null}
            <span className={`truncate text-sm ${value ? "font-medium" : "text-muted"}`}>
              {field.label}
            </span>
            <div className="flex shrink-0 gap-1.5">
              {options.map((option) => {
                const active = value === option;
                return (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={active}
                    aria-label={`${field.label} ${PART_FIT_LABELS[option]}`}
                    onClick={() => toggle(field.key, option)}
                    className={`min-w-[46px] rounded-lg border px-1.5 py-1.5 text-xs font-medium
                      transition-colors ${
                        active
                          ? "border-ink bg-ink text-paper"
                          : "border-line text-muted hover:border-ink hover:text-ink"
                      }`}
                  >
                    {PART_FIT_LABELS[option]}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
