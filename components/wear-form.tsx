"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { ItemPhoto } from "@/components/item-photo";
import { FeltPicker } from "@/components/feedback-picker";
import { PlacePicker } from "@/components/place-picker";
import { deleteWearLog } from "@/app/actions/wear";
import { CATEGORIES, CATEGORY_META, type Category } from "@/lib/categories";
import type { Place } from "@/lib/places";
import type { ActionState, Item, OutfitWithItems, WearLogWithItems } from "@/lib/types";

type Props = {
  date: string;
  items: Item[];
  outfits: OutfitWithItems[];
  log: WearLogWithItems | null;
  /** 설정에 정해 둔 기본 지역 */
  basePlace: Place;
  /** 이 날만 따로 적어 둔 지역 (없으면 기본 지역을 쓴다) */
  place: Place | null;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
};

export function WearForm({ date, items, outfits, log, basePlace, place, action }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);

  const [outfitId, setOutfitId] = useState<string | null>(log?.outfit_id ?? null);
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(log?.items.map((item) => item.id) ?? []),
  );
  const [filter, setFilter] = useState<Category | "all">("all");
  const [spot, setSpot] = useState<Place | null>(place);

  /** 코디를 고르면 그 구성 옷으로 통째로 바꾼다 */
  function chooseOutfit(outfit: OutfitWithItems) {
    if (outfitId === outfit.id) {
      setOutfitId(null);
      setPicked(new Set());
      return;
    }
    setOutfitId(outfit.id);
    setPicked(
      new Set(
        outfit.items
          .map((entry) => entry.item?.id)
          .filter((id): id is string => Boolean(id)),
      ),
    );
  }

  /** 옷을 직접 건드리면 더 이상 "그 코디를 입은 날"이 아니다 */
  function toggleItem(id: string) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setOutfitId(null);
  }

  const visible = filter === "all" ? items : items.filter((item) => item.category === filter);

  return (
    <>
      <form action={formAction} className="mt-10 space-y-12">
        <input type="hidden" name="worn_on" value={date} />
        {outfitId ? <input type="hidden" name="outfit_id" value={outfitId} /> : null}
        {[...picked].map((id) => (
          <input key={id} type="hidden" name="item_ids" value={id} />
        ))}

        {outfits.length > 0 && (
          <section>
            <h2 className="display text-2xl">저장한 코디에서</h2>
            <p className="mt-2 text-sm text-muted">
              고르면 그 코디의 옷이 그대로 채워집니다. 아래에서 하나씩 고쳐도 됩니다.
            </p>

            <div className="no-scrollbar mt-5 flex gap-4 overflow-x-auto pb-1">
              {outfits.map((outfit) => {
                const active = outfitId === outfit.id;
                const filled = outfit.items.filter((entry) => entry.item);
                return (
                  <button
                    key={outfit.id}
                    type="button"
                    onClick={() => chooseOutfit(outfit)}
                    aria-pressed={active}
                    className={`w-32 shrink-0 rounded-xl border p-2 text-left transition-colors ${
                      active ? "border-ink bg-mist" : "border-line hover:border-ink"
                    }`}
                  >
                    <div className="grid grid-cols-2 gap-1">
                      {filled.slice(0, 4).map((entry) => (
                        <ItemPhoto
                          key={entry.slot}
                          path={entry.item!.photo_path}
                          alt={entry.item!.name}
                          category={entry.item!.category}
                          className="aspect-square rounded"
                          sizes="60px"
                          compact
                        />
                      ))}
                    </div>
                    <p className="mt-2 truncate text-xs font-semibold">{outfit.name}</p>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="display text-2xl">입은 옷</h2>
            <p className="text-sm text-muted">{picked.size}개 선택</p>
          </div>

          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`chip ${filter === "all" ? "chip-active" : ""}`}
            >
              전체
            </button>
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setFilter(category)}
                className={`chip ${filter === category ? "chip-active" : ""}`}
              >
                {CATEGORY_META[category].label}
              </button>
            ))}
          </div>

          {visible.length === 0 ? (
            <p className="mt-6 rounded-xl bg-mist px-6 py-12 text-center text-muted">
              고를 옷이 없습니다.{" "}
              <Link href="/closet/new" className="underline underline-offset-4">
                옷 등록하기
              </Link>
            </p>
          ) : (
            <div className="mt-6 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-6">
              {visible.map((item) => {
                const active = picked.has(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    aria-pressed={active}
                    className="text-left"
                  >
                    <ItemPhoto
                      path={item.photo_path}
                      alt={item.name}
                      category={item.category}
                      className={`aspect-square rounded-xl ${
                        active ? "ring-2 ring-ink ring-offset-2" : ""
                      }`}
                      sizes="(max-width: 640px) 30vw, 160px"
                    />
                    <p
                      className={`mt-2 truncate text-xs ${
                        active ? "font-semibold" : "text-muted"
                      }`}
                    >
                      {item.name}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="display text-2xl">그날 체감</h2>
          <p className="mt-2 text-sm text-muted">
            기온만으로는 안 남는 것. 다음에 비슷한 날씨일 때 참고가 됩니다.
          </p>
          <div className="mt-5">
            <FeltPicker defaultValue={log?.felt ?? null} />
          </div>
        </section>

        <section>
          <h2 className="display text-2xl">이 날 있던 곳</h2>
          <p className="mt-2 text-sm text-muted">
            여행처럼 다른 지역이었던 날만 골라주세요. 비워두면 기본 지역({basePlace.name}) 날씨로
            봅니다.
          </p>
          <div className="mt-5">
            <PlacePicker
              value={spot}
              onChange={setSpot}
              clearable
              clearLabel={`기본 지역 (${basePlace.name})`}
            />
          </div>
        </section>

        <section>
          <label className="label" htmlFor="memo">
            메모
          </label>
          <textarea
            id="memo"
            name="memo"
            rows={3}
            defaultValue={log?.memo ?? ""}
            placeholder="추웠다, 비 와서 신발이 젖었다 …"
            className="field resize-none"
          />
        </section>

        {state && !state.ok ? <p className="text-sm text-accent">{state.message}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={pending} className="btn-dark">
            {pending ? "저장 중…" : "저장"}
          </button>
          <Link href={`/calendar?m=${date.slice(0, 7)}`} className="btn-light">
            취소
          </Link>
        </div>
      </form>

      {log ? (
        // 저장 폼 안에 두면 폼이 중첩되므로 따로 뺀다
        <form action={deleteWearLog} className="mt-6">
          <input type="hidden" name="worn_on" value={date} />
          <button type="submit" className="btn-ghost px-0 text-sm text-muted">
            이 날 기록 지우기
          </button>
        </form>
      ) : null}
    </>
  );
}
