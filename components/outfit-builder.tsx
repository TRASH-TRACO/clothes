"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useMemo, useState } from "react";

import { saveOutfit } from "@/app/actions/outfits";
import { ColorDot } from "@/components/color-dot";
import { ItemPhoto } from "@/components/item-photo";
import { PhotoInput } from "@/components/photo-input";
import { CATEGORY_META, SLOT_ORDER, type Category } from "@/lib/categories";
import { photoUrl } from "@/lib/supabase/env";
import type { ActionState, Item } from "@/lib/types";

type Selection = Partial<Record<Category, string>>;

type Props = {
  items: Item[];
  userId: string;
  initialSelection?: Selection;
  outfit?: { id: string; name: string; memo: string | null; photo_path: string | null };
};

export function OutfitBuilder({ items, userId, initialSelection = {}, outfit }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveOutfit, null);
  const [selection, setSelection] = useState<Selection>(initialSelection);
  const [activeSlot, setActiveSlot] = useState<Category>(SLOT_ORDER[0]);

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const byCategory = useMemo(() => {
    const map = new Map<Category, Item[]>();
    for (const slot of SLOT_ORDER) map.set(slot, []);
    for (const item of items) map.get(item.category)?.push(item);
    return map;
  }, [items]);

  const chosen = SLOT_ORDER.map((slot) => ({ slot, item: byId.get(selection[slot] ?? "") ?? null }));
  const chosenCount = chosen.filter((entry) => entry.item).length;
  const candidates = byCategory.get(activeSlot) ?? [];

  function toggle(slot: Category, itemId: string) {
    setSelection((prev) => {
      const next = { ...prev };
      if (next[slot] === itemId) delete next[slot];
      else next[slot] = itemId;
      return next;
    });
  }

  function clearSlot(slot: Category) {
    setSelection((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  }

  function shuffle() {
    const next: Selection = {};
    for (const slot of SLOT_ORDER) {
      const pool = byCategory.get(slot) ?? [];
      if (pool.length === 0) continue;
      // 모자·아우터·액세서리는 가끔 빼서 조합이 뻔해지지 않게 한다
      if ((slot === "hat" || slot === "acc" || slot === "outer") && Math.random() < 0.4) continue;
      next[slot] = pool[Math.floor(Math.random() * pool.length)].id;
    }
    setSelection(next);
  }

  return (
    <form action={formAction} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      {outfit ? <input type="hidden" name="outfit_id" value={outfit.id} /> : null}
      {SLOT_ORDER.map((slot) =>
        selection[slot] ? (
          <input key={slot} type="hidden" name={`slot_${slot}`} value={selection[slot]} />
        ) : null,
      )}

      {/* 코디 보드 */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="eyebrow">Look</h2>
          <button
            type="button"
            onClick={shuffle}
            className="text-sm underline underline-offset-4 hover:text-muted"
          >
            랜덤 조합
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-mist p-3 sm:grid-cols-3">
          {chosen.map(({ slot, item }) => (
            <div key={slot} className="relative">
              <button
                type="button"
                onClick={() => {
                  setActiveSlot(slot);
                  if (item) clearSlot(slot);
                }}
                className={`group relative block aspect-square w-full overflow-hidden rounded-xl transition-colors ${
                  item ? "bg-paper" : "border-2 border-dashed border-line bg-paper/50"
                } ${activeSlot === slot ? "ring-2 ring-ink" : ""}`}
              >
                {item ? (
                  <>
                    {photoUrl(item.photo_path) ? (
                      <Image
                        src={photoUrl(item.photo_path)!}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 50vw, 260px"
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <span className="display flex h-full items-center justify-center text-2xl text-line">
                        {CATEGORY_META[slot].en}
                      </span>
                    )}
                    <span className="absolute inset-x-0 bottom-0 hidden bg-ink/80 py-2 text-center text-xs text-paper group-hover:block">
                      빼기
                    </span>
                  </>
                ) : (
                  <span className="flex h-full flex-col items-center justify-center gap-1 text-muted">
                    <span className="display text-xl text-line">{CATEGORY_META[slot].en}</span>
                    <span className="text-xs">고르기</span>
                  </span>
                )}
              </button>
              <p className="mt-2 truncate px-1 text-xs text-muted">
                {CATEGORY_META[slot].label}
                {item ? ` · ${item.name}` : ""}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-6 border-t border-line pt-6">
          <div>
            <p className="label mb-2">착장 사진 (선택)</p>
            <p className="mb-3 text-sm text-muted">
              실제로 입은 모습을 남겨두면 나중에 고를 때 훨씬 빠릅니다.
            </p>
            <div className="max-w-[320px]">
              <PhotoInput
                userId={userId}
                defaultPath={outfit?.photo_path ?? null}
                emptyLabel="탭해서 착장 사진 올리기"
                alt="착장 사진"
                /* 상세 페이지가 3:4로 보여준다 */
                aspect={3 / 4}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="name">
              코디 이름
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={60}
              defaultValue={outfit?.name}
              placeholder="예: 비 오는 날 출근룩"
              className="field max-w-md"
            />
          </div>
          <div>
            <label className="label" htmlFor="memo">
              메모
            </label>
            <textarea
              id="memo"
              name="memo"
              rows={2}
              maxLength={300}
              defaultValue={outfit?.memo ?? ""}
              placeholder="어떤 날에 입을지, 무엇과 잘 어울리는지"
              className="field max-w-md resize-none"
            />
          </div>

          {state && !state.ok ? (
            <p role="alert" className="text-sm font-medium text-accent">
              {state.message}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={pending || chosenCount < 2}
              className="btn-dark min-w-[180px]"
            >
              {pending ? "저장 중…" : outfit ? "코디 수정 저장" : "이 코디 저장"}
            </button>
            <span className="text-sm text-muted">{chosenCount}개 선택됨 (최소 2개)</span>
          </div>
        </div>
      </section>

      {/* 옷 고르기 */}
      <aside className="lg:sticky lg:top-32 lg:max-h-[calc(100vh-9rem)] lg:self-start lg:overflow-y-auto">
        <h2 className="eyebrow mb-4">옷 고르기</h2>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {SLOT_ORDER.map((slot) => (
            <button
              key={slot}
              type="button"
              onClick={() => setActiveSlot(slot)}
              className={`chip ${activeSlot === slot ? "chip-active" : ""}`}
            >
              {CATEGORY_META[slot].label}
            </button>
          ))}
        </div>

        {candidates.length === 0 ? (
          <div className="mt-6 rounded-xl bg-mist px-6 py-12 text-center text-sm text-muted">
            등록된 {CATEGORY_META[activeSlot].label}이(가) 없습니다.
            <Link href="/closet/new" className="mt-3 block underline underline-offset-4">
              지금 등록하기
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-3 gap-3 lg:grid-cols-2">
            {candidates.map((item) => {
              const active = selection[item.category] === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.category, item.id)}
                  className="group text-left"
                >
                  <ItemPhoto
                    path={item.photo_path}
                    alt={item.name}
                    category={item.category}
                    className={`aspect-square rounded-lg ${active ? "ring-2 ring-ink ring-offset-2" : ""}`}
                    sizes="180px"
                  />
                  <p className="mt-2 truncate text-xs font-medium">{item.name}</p>
                  <p className="flex items-center gap-1.5 truncate text-xs text-muted">
                    <ColorDot hex={item.color_hex} size={10} />
                    {item.color_name}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </aside>
    </form>
  );
}
