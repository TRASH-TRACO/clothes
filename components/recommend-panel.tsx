"use client";

import Link from "next/link";
import { useActionState } from "react";

import { ItemPhoto } from "@/components/item-photo";
import { recommendOutfits, type RecommendState } from "@/app/actions/recommend";
import { CATEGORY_META } from "@/lib/categories";
import type { Item } from "@/lib/types";

/** 눌러만 봐도 되게 몇 가지 요청을 미리 적어 둔다 */
const PRESETS = ["오늘 출근룩", "편하게 동네만", "약속 있는 날", "비 와도 괜찮게"];

export function RecommendPanel({ items }: { items: Item[] }) {
  const [state, formAction, pending] = useActionState<RecommendState, FormData>(
    recommendOutfits,
    null,
  );
  const byId = new Map(items.map((item) => [item.id, item]));

  return (
    <div>
      <form action={formAction} className="space-y-4">
        <div>
          <label className="label" htmlFor="request">
            원하는 게 있나요? (선택)
          </label>
          <input
            id="request"
            name="request"
            maxLength={200}
            placeholder="예: 좀 격식 있게, 많이 걸을 예정"
            className="field"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                const field = document.getElementById("request") as HTMLInputElement | null;
                if (field) field.value = preset;
              }}
              className="chip"
            >
              {preset}
            </button>
          ))}
        </div>

        <button type="submit" disabled={pending} className="btn-dark w-full py-4 sm:w-auto sm:px-10">
          {pending ? "고르는 중…" : "추천받기"}
        </button>
      </form>

      {pending ? (
        <p className="mt-8 text-sm text-muted">
          옷장과 날씨를 같이 보고 있습니다. 10초쯤 걸립니다.
        </p>
      ) : null}

      {state && !state.ok ? (
        <p role="alert" className="mt-8 text-sm font-medium text-accent">
          {state.message}
        </p>
      ) : null}

      {state && state.ok ? (
        <div className="mt-10 space-y-10">
          {state.recommendations.map((recommendation, index) => {
            // 고른 옷을 코디 만들기 화면에 그대로 넘긴다 (?top=<id>&bottom=<id>)
            const query = recommendation.picks
              .map((pick) => `${pick.slot}=${encodeURIComponent(pick.itemId)}`)
              .join("&");

            return (
              <section key={index} className="border-t border-line pt-8">
                <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="text-xl font-semibold">{recommendation.name}</h2>
                  <Link
                    href={`/studio?${query}`}
                    className="text-sm underline underline-offset-4 hover:text-muted"
                  >
                    이 조합으로 코디 만들기 →
                  </Link>
                </div>

                <p className="mb-5 text-muted">{recommendation.reason}</p>

                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {recommendation.picks.map((pick) => {
                    const item = byId.get(pick.itemId);
                    if (!item) return null;
                    return (
                      <Link key={pick.itemId} href={`/closet/${item.id}`} className="group">
                        <ItemPhoto
                          path={item.photo_path}
                          alt={item.name}
                          category={item.category}
                          className="aspect-square rounded-xl"
                          sizes="180px"
                        />
                        <p className="mt-2 text-xs text-muted">
                          {CATEGORY_META[pick.slot].label}
                        </p>
                        <p className="truncate text-sm font-medium group-hover:underline">
                          {item.name}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}

          <p className="text-xs text-muted">
            AI가 고른 조합이라 늘 맞지는 않습니다. 마음에 들면 코디로 저장해 두세요.
          </p>
        </div>
      ) : null}
    </div>
  );
}
