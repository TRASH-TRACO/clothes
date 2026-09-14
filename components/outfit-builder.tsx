"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useMemo, useRef, useState } from "react";

import { saveOutfit } from "@/app/actions/outfits";
import { ColorDot } from "@/components/color-dot";
import { ItemPhoto } from "@/components/item-photo";
import { RatingPicker } from "@/components/feedback-picker";
import { PhotoListInput } from "@/components/photo-list-input";
import { CATEGORY_META, SLOT_ORDER, type Category } from "@/lib/categories";
import { findSameOutfit, outfitKey, type KnownOutfit } from "@/lib/outfit-key";
import { outfitPhotos } from "@/lib/photos";
import { photoUrl } from "@/lib/supabase/env";
import type { Rating } from "@/lib/feedback";
import type { ActionState, Item, OutfitFolder } from "@/lib/types";

type Selection = Partial<Record<Category, string>>;

type Props = {
  items: Item[];
  userId: string;
  initialSelection?: Selection;
  /** 이미 저장해 둔 코디들. 같은 조합을 또 만들지 않으려고 본다 */
  known?: KnownOutfit[];
  outfit?: {
    id: string;
    name: string | null;
    memo: string | null;
    photo_path: string | null;
    photo_paths: string[];
    rating: Rating | null;
    folder_id: string | null;
  };
  /** 만들어 둔 폴더. 비어 있으면 기본 폴더 하나만 있는 것처럼 보여준다 */
  folders?: OutfitFolder[];
};

export function OutfitBuilder({
  items,
  userId,
  initialSelection = {},
  known = [],
  folders = [],
  outfit,
}: Props) {
  const pickerRef = useRef<HTMLElement>(null);

  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveOutfit, null);
  const [selection, setSelection] = useState<Selection>(initialSelection);
  const [activeSlot, setActiveSlot] = useState<Category>(SLOT_ORDER[0]);

  // 어느 폴더에 넣을지. 처음에는 넣어 둔 폴더, 없으면 기본 폴더.
  const [folderId, setFolderId] = useState(
    outfit?.folder_id ?? folders.find((entry) => entry.is_default)?.id ?? "",
  );
  /** 새 폴더 이름을 적는 중인지. 적었으면 그 폴더를 만들어서 넣는다 */
  const [newFolder, setNewFolder] = useState<string | null>(null);

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const byCategory = useMemo(() => {
    const map = new Map<Category, Item[]>();
    for (const slot of SLOT_ORDER) map.set(slot, []);
    for (const item of items) map.get(item.category)?.push(item);
    return map;
  }, [items]);

  const chosen = SLOT_ORDER.map((slot) => ({ slot, item: byId.get(selection[slot] ?? "") ?? null }));
  const chosenCount = chosen.filter((entry) => entry.item).length;

  // 이름을 다 짓고 눌렀는데 그제서야 "이미 있다" 고 하면 늦다. 고르는 동안 알려준다.
  // (저장할 때 서버도 한 번 더 본다 — 탭을 두 개 띄워 두면 이 목록이 낡는다)
  const duplicate = findSameOutfit(
    outfitKey(SLOT_ORDER.map((slot) => selection[slot])),
    known,
    outfit?.id ?? null,
  );
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
      <section className="lg:col-start-1 lg:row-start-1">
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
                  // 좁은 화면에서는 옷 고르기가 아래에 있어 한참 내려가야 한다.
                  // 넓은 화면은 옆에 붙어 있으므로 그냥 둔다.
                  if (!window.matchMedia("(min-width: 1024px)").matches) {
                    // 다시 그려진 뒤에, 상단 고정 헤더 높이만큼 빼고 옮긴다.
                    // scrollIntoView 는 누른 버튼에 포커스가 남아 중간에 멈춘다.
                    requestAnimationFrame(() => {
                      const picker = pickerRef.current;
                      if (!picker) return;
                      const top = picker.getBoundingClientRect().top + window.scrollY - 140;
                      window.scrollTo({ top, behavior: "instant" });
                    });
                  }
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

      </section>

      {/* 옷 고르기 */}
      <aside
        ref={pickerRef}
        className="scroll-mt-36 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-32 lg:max-h-[calc(100vh-9rem)] lg:self-start lg:overflow-y-auto">
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

      {/* 사진·이름·메모는 옷을 고른 뒤에 채우므로 옷 고르기 아래에 둔다 */}
      <section className="lg:col-start-1 lg:row-start-2">
        <div className="mt-8 space-y-6 border-t border-line pt-6">
          <div>
            <p className="label mb-2">착장 사진 (선택)</p>
            <p className="mb-3 text-sm text-muted">
              실제로 입은 모습을 남겨두면 나중에 고를 때 훨씬 빠릅니다. 여러 장 올리면
              상세에서 넘겨볼 수 있고, 첫 장이 목록에 걸립니다.
            </p>
            <div className="max-w-[320px]">
              <PhotoListInput
                userId={userId}
                defaultPaths={outfit ? outfitPhotos(outfit) : []}
                /* 상세 페이지가 3:4로 보여준다 */
                aspect={3 / 4}
              />
            </div>
          </div>

          {/* 저장에 필요한 건 이것뿐이다. 이름·사진·메모는 없어도 된다. */}
          <div>
            <p className="label mb-2">폴더</p>
            <p className="mb-3 text-sm text-muted">
              코디는 폴더에만 넣으면 저장됩니다. 나머지는 안 채워도 됩니다.
            </p>

            {newFolder === null ? <input type="hidden" name="folder_id" value={folderId} /> : null}

            <div className="flex flex-wrap gap-2">
              {(folders.length > 0
                ? folders
                : // 아직 폴더가 없으면 기본 폴더 하나만 있는 것처럼. 저장할 때 만들어진다.
                  [{ id: "", name: "기본", is_default: true } as OutfitFolder]
              ).map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  aria-pressed={newFolder === null && folderId === folder.id}
                  onClick={() => {
                    setFolderId(folder.id);
                    setNewFolder(null);
                  }}
                  className={`chip ${
                    newFolder === null && folderId === folder.id ? "chip-active" : ""
                  }`}
                >
                  {folder.name}
                </button>
              ))}

              {newFolder === null ? (
                <button type="button" onClick={() => setNewFolder("")} className="chip">
                  + 새 폴더
                </button>
              ) : null}
            </div>

            {newFolder !== null ? (
              <div className="mt-3 flex max-w-md items-center gap-2">
                <input
                  name="folder_new"
                  autoFocus
                  maxLength={30}
                  value={newFolder}
                  onChange={(event) => setNewFolder(event.target.value)}
                  placeholder="예: 출근룩, 결혼식룩"
                  className="field"
                />
                <button
                  type="button"
                  onClick={() => setNewFolder(null)}
                  className="shrink-0 text-sm text-muted underline underline-offset-4 hover:text-ink"
                >
                  취소
                </button>
              </div>
            ) : null}
          </div>

          <div>
            <label className="label" htmlFor="name">
              코디 이름 <span className="font-normal normal-case tracking-normal text-muted">(선택)</span>
            </label>
            <input
              id="name"
              name="name"
              maxLength={60}
              defaultValue={outfit?.name ?? ""}
              placeholder="안 지으면 들어간 옷 이름으로 부릅니다"
              className="field max-w-md"
            />
          </div>
          <div>
            <p className="label">입어보니 어땠나요</p>
            <RatingPicker defaultValue={outfit?.rating ?? null} />
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

          {duplicate ? (
            <p role="status" className="rounded-xl bg-mist px-5 py-4 text-sm">
              {/* 이름 뒤에 조사를 붙이면 받침에 따라 "으로/로" 가 갈린다.
                  이름은 사람이 짓는 값이라 맞출 수 없으므로 조사를 안 쓴다. */}
              이 조합은 이미 저장돼 있습니다 —{" "}
              <Link
                href={`/outfits/${duplicate.id}`}
                className="font-semibold underline underline-offset-4"
              >
                {duplicate.name}
              </Link>
              <span className="mt-1 block text-muted">
                한 벌 빼거나 더해서 다른 조합으로 만들어 보세요.
              </span>
            </p>
          ) : null}

          {state && !state.ok ? (
            <p role="alert" className="text-sm font-medium text-accent">
              {state.message}
              {state.link ? (
                <>
                  {" "}
                  <Link href={state.link.href} className="underline underline-offset-4">
                    {state.link.label}
                  </Link>
                </>
              ) : null}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={pending || chosenCount < 2 || Boolean(duplicate)}
              className="btn-dark min-w-[180px]"
            >
              {pending ? "저장 중…" : outfit ? "코디 수정 저장" : "이 코디 저장"}
            </button>
            <span className="text-sm text-muted">
              {duplicate ? "이미 있는 조합입니다" : `${chosenCount}개 선택됨 (최소 2개)`}
            </span>
          </div>
        </div>
      </section>
    </form>
  );
}
