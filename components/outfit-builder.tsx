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

type Props = {
  items: Item[];
  userId: string;
  /** 미리 골라 둔 옷 id. 순서가 그대로 겹쳐 입은 순서가 된다 */
  initialPicks?: string[];
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

/**
 * 코디 만들기.
 *
 * **분류당 한 벌이 아니다.** 사람은 겹쳐 입는다 — 티셔츠 위에 셔츠, 가디건 위에 코트.
 * 그래서 고른 옷을 분류별 칸이 아니라 **한 줄로 세운 목록**으로 들고 있고, 같은 분류
 * 안에서의 순서가 그대로 안에서 겉으로 가는 순서(layer)가 된다.
 */
export function OutfitBuilder({
  items,
  userId,
  initialPicks = [],
  known = [],
  folders = [],
  outfit,
}: Props) {
  const pickerRef = useRef<HTMLElement>(null);

  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveOutfit, null);
  const [picks, setPicks] = useState<string[]>(initialPicks);
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

  /** 고른 옷을 분류별로 모은다. 분류 안에서는 고른 순서 = 안에서 겉으로 */
  const groups = useMemo(() => {
    const map = new Map<Category, Item[]>();
    for (const slot of SLOT_ORDER) map.set(slot, []);
    for (const id of picks) {
      const item = byId.get(id);
      if (item) map.get(item.category)?.push(item);
    }
    return map;
  }, [picks, byId]);

  /** 폼에 실을 순서. 분류는 보드와 같은 순서로, 그 안은 겹쳐 입은 순서로 */
  const ordered = SLOT_ORDER.flatMap((slot) => (groups.get(slot) ?? []).map((item) => item.id));
  const chosenCount = ordered.length;

  // 이름을 다 짓고 눌렀는데 그제서야 "이미 있다" 고 하면 늦다. 고르는 동안 알려준다.
  // (저장할 때 서버도 한 번 더 본다 — 탭을 두 개 띄워 두면 이 목록이 낡는다)
  const duplicate = findSameOutfit(outfitKey(ordered), known, outfit?.id ?? null);
  const candidates = byCategory.get(activeSlot) ?? [];

  /** 고르면 그 분류의 **맨 겉**에 더한다. 이미 골랐으면 뺀다 */
  function toggle(itemId: string) {
    setPicks((prev) => (prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]));
  }

  function remove(itemId: string) {
    setPicks((prev) => prev.filter((id) => id !== itemId));
  }

  /**
   * 같은 분류 안에서 한 칸 안쪽(−1) 또는 겉쪽(+1)으로.
   *
   * picks 는 분류가 섞인 한 줄이라 이웃이 같은 분류가 아닐 수 있다.
   * 그래서 **같은 분류끼리만** 자리를 맞바꾼다.
   */
  function shift(itemId: string, by: -1 | 1) {
    setPicks((prev) => {
      const item = byId.get(itemId);
      if (!item) return prev;
      const sameSlot = prev.filter((id) => byId.get(id)?.category === item.category);
      const at = sameSlot.indexOf(itemId);
      const to = at + by;
      if (at < 0 || to < 0 || to >= sameSlot.length) return prev;

      const swapped = [...sameSlot];
      [swapped[at], swapped[to]] = [swapped[to], swapped[at]];
      // 그 분류의 자리들에 바뀐 순서를 다시 끼워 넣는다 (다른 분류는 그대로)
      let cursor = 0;
      return prev.map((id) =>
        byId.get(id)?.category === item.category ? swapped[cursor++] : id,
      );
    });
  }

  /** 그 분류를 고르는 자리로 보낸다 */
  function openPicker(slot: Category) {
    setActiveSlot(slot);
    // 좁은 화면에서는 옷 고르기가 아래에 있어 한참 내려가야 한다.
    // 넓은 화면은 옆에 붙어 있으므로 그냥 둔다.
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    // 다시 그려진 뒤에, 상단 고정 헤더 높이만큼 빼고 옮긴다.
    // scrollIntoView 는 누른 버튼에 포커스가 남아 중간에 멈춘다.
    requestAnimationFrame(() => {
      const picker = pickerRef.current;
      if (!picker) return;
      window.scrollTo({ top: picker.getBoundingClientRect().top + window.scrollY - 140, behavior: "instant" });
    });
  }

  function shuffle() {
    const next: string[] = [];
    for (const slot of SLOT_ORDER) {
      const pool = byCategory.get(slot) ?? [];
      if (pool.length === 0) continue;
      // 모자·아우터·액세서리는 가끔 빼서 조합이 뻔해지지 않게 한다
      if ((slot === "hat" || slot === "acc" || slot === "outer") && Math.random() < 0.4) continue;
      next.push(pool[Math.floor(Math.random() * pool.length)].id);
    }
    setPicks(next);
  }

  return (
    <form action={formAction} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      {outfit ? <input type="hidden" name="outfit_id" value={outfit.id} /> : null}
      {/* 보내는 순서가 그대로 겹쳐 입은 순서가 된다 (서버가 분류별로 번호를 매긴다) */}
      {ordered.map((id) => (
        <input key={id} type="hidden" name="item_ids" value={id} />
      ))}

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

        {/* 분류마다 한 줄 — 겹쳐 입은 옷이 옆으로 늘어선다. 칸이 여섯 개로 정해져
            있으면 둘 자리가 없다. 빈 분류는 줄을 안 만들고 아래 칩으로만 둔다
            (여섯 줄을 늘 깔면 좁은 화면에서 옷 고르기까지 한참 내려가야 한다). */}
        <div className="space-y-3 rounded-2xl bg-mist p-4">
          {chosenCount === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              아래에서 옷을 고르면 여기에 쌓입니다. 같은 분류를 여러 벌 골라 겹쳐 입어도 됩니다.
            </p>
          ) : null}

          {SLOT_ORDER.filter((slot) => (groups.get(slot) ?? []).length > 0).map((slot) => {
            const worn = groups.get(slot)!;
            return (
              <div key={slot} className="flex gap-3">
                <div className="w-14 shrink-0 pt-1">
                  <p className="eyebrow">{CATEGORY_META[slot].label}</p>
                  {/* 한 벌일 때는 안팎을 말할 게 없다 */}
                  {worn.length > 1 ? (
                    <p className="mt-1 text-[10px] leading-tight text-muted">안 → 겉</p>
                  ) : null}
                </div>

                <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                  {worn.map((item, index) => (
                    <div key={item.id} className="relative w-20 shrink-0">
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        aria-label={`${item.name} 빼기`}
                        className="group relative block aspect-square w-full overflow-hidden rounded-xl bg-paper"
                      >
                        {photoUrl(item.photo_path) ? (
                          <Image
                            src={photoUrl(item.photo_path)!}
                            alt={item.name}
                            fill
                            sizes="120px"
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <span className="display flex h-full items-center justify-center text-xs text-line">
                            {CATEGORY_META[slot].en}
                          </span>
                        )}
                        <span className="absolute inset-x-0 bottom-0 hidden bg-ink/80 py-1 text-center text-[11px] text-paper group-hover:block">
                          빼기
                        </span>
                      </button>

                      {/* 겹쳐 입었을 때만. 안팎을 바꿀 수 있어야 레이어드가 레이어드다 */}
                      {worn.length > 1 ? (
                        <div className="absolute inset-x-0 top-0 flex justify-between">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => shift(item.id, -1)}
                            aria-label={`${item.name} 안쪽으로`}
                            className="rounded-br-lg rounded-tl-xl bg-ink/70 px-2 py-1 text-xs
                              leading-none text-paper disabled:invisible"
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            disabled={index === worn.length - 1}
                            onClick={() => shift(item.id, 1)}
                            aria-label={`${item.name} 겉으로`}
                            className="rounded-bl-lg rounded-tr-xl bg-ink/70 px-2 py-1 text-xs
                              leading-none text-paper disabled:invisible"
                          >
                            ›
                          </button>
                        </div>
                      ) : null}

                      <p className="mt-1.5 truncate text-[11px] text-muted">{item.name}</p>
                    </div>
                  ))}

                  {/* 겹쳐 입으려면 이미 한 벌 있어도 더 담을 자리가 있어야 한다 */}
                  <button
                    type="button"
                    onClick={() => openPicker(slot)}
                    aria-label={`${CATEGORY_META[slot].label} 더 고르기`}
                    className="flex aspect-square w-20 shrink-0 flex-col items-center justify-center
                      gap-0.5 self-start rounded-xl border-2 border-dashed border-line bg-paper/50
                      text-muted transition-colors hover:border-ink"
                  >
                    <span className="display text-xl text-line">+</span>
                    <span className="text-[11px]">겹치기</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* 아직 안 고른 분류. 줄을 통째로 깔지 않고 칩 한 줄로만 둔다 */}
          <div className="no-scrollbar flex gap-2 overflow-x-auto pt-1">
            {SLOT_ORDER.filter((slot) => (groups.get(slot) ?? []).length === 0).map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => openPicker(slot)}
                className={`chip shrink-0 bg-paper ${activeSlot === slot ? "chip-active" : ""}`}
              >
                + {CATEGORY_META[slot].label}
              </button>
            ))}
          </div>
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
              const active = picks.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggle(item.id)}
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
