"use client";

import { useActionState, useState } from "react";

import { saveBasePlace } from "@/app/actions/places";
import { PlacePicker } from "@/components/place-picker";
import type { Place } from "@/lib/places";
import type { ActionState } from "@/lib/types";

export function BasePlaceForm({ current }: { current: Place }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveBasePlace, null);
  const [place, setPlace] = useState<Place | null>(current);

  return (
    <form action={formAction} className="mt-8">
      <PlacePicker value={place} onChange={setPlace} />

      {state ? (
        <p className={`mt-5 text-sm ${state.ok ? "text-ink" : "text-accent"}`}>{state.message}</p>
      ) : null}

      <button type="submit" disabled={pending || !place} className="btn-dark mt-6">
        {pending ? "저장 중…" : "기본 지역으로 저장"}
      </button>
    </form>
  );
}
