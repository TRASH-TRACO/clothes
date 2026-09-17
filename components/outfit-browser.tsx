"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { addOutfitFolder, removeOutfitFolder } from "@/app/actions/outfits";
import { ConfirmForm } from "@/components/confirm-form";
import { RatingGlyph } from "@/components/feedback-glyph";
import { OutfitCard } from "@/components/outfit-card";
import { isRating, RATING_LABELS, RATING_VALUES, type Rating } from "@/lib/feedback";
import type { OutfitFolder, OutfitWithItems } from "@/lib/types";

type Props = { outfits: OutfitWithItems[]; folders: OutfitFolder[] };

/** 아직 만족도를 안 적은 코디만 보는 칸. 적어 둔 값과 겹치지 않는 이름이면 된다 */
const UNRATED = "none";

/**
 * 저장한 코디 목록과 필터.
 *
 * **폴더를 옮길 때 서버를 안 부른다.** 코디는 어차피 한 번에 다 받아 두고, 폴더는
 * 그중 어느 것을 보여줄지 고르는 일일 뿐이다. 예전에는 폴더마다 `/outfits?f=…` 로
 * 페이지를 다시 받아서, 이미 손에 있는 목록을 다시 받아오는 동안 뼈대 화면이
 * 번쩍였다 (탭 사이를 옮길 때 느렸던 것과 같은 문제다).
 *
 * 고른 조건은 주소에 담아 두므로 새로고침하거나 링크를 복사해도 그대로다
 * (`history.pushState` 라서 뒤로 가기도 된다).
 */
export function OutfitBrowser({ outfits, folders }: Props) {
  const params = useSearchParams();

  const home = folders.find((folder) => folder.is_default) ?? null;
  /**
   * 폴더가 없는 코디는 기본 폴더 것으로 본다.
   * 폴더가 생기기 전에 저장한 코디와, 폴더를 지웠다 옮기기 전의 코디가 여기 해당한다.
   */
  const folderOf = useCallback(
    (folderId: string | null) => folderId ?? home?.id ?? "",
    [home],
  );

  const picked = params.get("f");
  const openFolder = folders.find((folder) => folder.id === picked) ?? null;
  const rawRating = params.get("r");
  const rating = isRating(rawRating) || rawRating === UNRATED ? rawRating : null;

  /** 주소만 바꾼다. 서버는 부르지 않는다 */
  const apply = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null) next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      window.history.pushState(null, "", query ? `?${query}` : window.location.pathname);
    },
    [params],
  );

  const folderCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const outfit of outfits) {
      const key = folderOf(outfit.folder_id);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [outfits, folderOf]);

  /** 만족도 칩을 세는 건 지금 보고 있는 폴더 안에서만. 다른 폴더 것까지 세면 헷갈린다 */
  const pool = useMemo(
    () =>
      openFolder
        ? outfits.filter((outfit) => folderOf(outfit.folder_id) === openFolder.id)
        : outfits,
    [outfits, openFolder, folderOf],
  );

  const ratingCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const outfit of pool) {
      const key = outfit.rating ?? UNRATED;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [pool]);

  const shown = useMemo(() => {
    if (!rating) return pool;
    return pool.filter((outfit) => (outfit.rating ?? UNRATED) === rating);
  }, [pool, rating]);

  type Chip = { value: Rating | typeof UNRATED; label: string; count: number };

  const allChips: Chip[] = [
    ...RATING_VALUES.map<Chip>((value) => ({
      value,
      label: RATING_LABELS[value],
      count: ratingCounts.get(value) ?? 0,
    })),
    { value: UNRATED, label: "안 적음", count: ratingCounts.get(UNRATED) ?? 0 },
  ];
  /** 만족도 칩은 그 폴더에 실제로 있는 것만 (없는 걸 고를 일은 없다) */
  const ratingChips = allChips.filter((chip) => chip.count > 0);

  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Saved looks</p>
          <h1 className="display mt-2 text-5xl sm:text-6xl">
            {openFolder?.name ?? "저장한 코디"}
          </h1>
        </div>
        <Link href="/studio" className="btn-dark">
          새 코디 만들기
        </Link>
      </div>

      {/* 폴더는 코디를 저장할 때 만들어진다. 하나도 없으면 줄 자체를 안 그린다. */}
      {folders.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => apply({ f: null })}
            className={`chip ${openFolder ? "" : "chip-active"}`}
          >
            전체 <span className={openFolder ? "text-muted" : "text-white/60"}>{outfits.length}</span>
          </button>
          {folders.map((folder) => {
            const active = openFolder?.id === folder.id;
            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => apply({ f: active ? null : folder.id })}
                className={`chip ${active ? "chip-active" : ""}`}
              >
                {folder.name}{" "}
                <span className={active ? "text-white/60" : "text-muted"}>
                  {folderCounts.get(folder.id) ?? 0}
                </span>
              </button>
            );
          })}

          {/* details 를 쓰면 자바스크립트 없이도 열린다 */}
          <details className="relative">
            <summary className="chip cursor-pointer list-none">+ 새 폴더</summary>
            <form
              action={addOutfitFolder}
              className="absolute left-0 top-full z-10 mt-2 flex w-64 gap-2 rounded-xl
                border border-line bg-paper p-3 shadow-lg"
            >
              <input
                name="name"
                maxLength={30}
                required
                placeholder="예: 출근룩"
                className="field py-2"
              />
              <button type="submit" className="btn-dark shrink-0 px-4 py-2">
                추가
              </button>
            </form>
          </details>

          {/* 기본 폴더는 지울 수 없다. 갈 곳이 없어진다. */}
          {openFolder && !openFolder.is_default ? (
            <div className="ml-auto">
              <ConfirmForm
                action={removeOutfitFolder}
                hidden={{ id: openFolder.id }}
                label="이 폴더 지우기"
                triggerClassName="text-sm text-muted underline underline-offset-4 hover:text-accent"
                title={`${openFolder.name} 폴더를 지울까요?`}
                body={`안에 있던 코디는 사라지지 않고 ${home?.name ?? "기본"} 폴더로 옮겨집니다.`}
                confirmLabel="폴더 지우기"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {/* 입어 보고 적어 둔 만족도. 하나도 안 적었으면 줄을 안 그린다 */}
      {ratingChips.length > 0 ? (
        <div className="no-scrollbar mb-10 flex items-center gap-2 overflow-x-auto pb-1">
          <span className="eyebrow shrink-0 pr-1">만족도</span>
          <button
            type="button"
            onClick={() => apply({ r: null })}
            className={`chip ${rating ? "" : "chip-active"}`}
          >
            전체
          </button>
          {ratingChips.map((chip) => {
            const active = rating === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => apply({ r: active ? null : chip.value })}
                className={`chip ${active ? "chip-active" : ""}`}
              >
                {chip.value === UNRATED ? null : (
                  <RatingGlyph value={chip.value} className="h-4 w-4 shrink-0" />
                )}
                {chip.label}{" "}
                <span className={active ? "text-white/60" : "text-muted"}>{chip.count}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      {shown.length === 0 ? (
        <div className="rounded-xl bg-mist px-6 py-20 text-center">
          <p className="display text-3xl text-line">No looks yet</p>
          <p className="mt-4 text-muted">
            {rating
              ? "조건에 맞는 코디가 없습니다."
              : openFolder
                ? "이 폴더에는 아직 코디가 없습니다."
                : "옷장에서 조합해 첫 코디를 저장해보세요."}
          </p>
          <Link href="/studio" className="btn-dark mt-6">
            코디 만들기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {shown.map((outfit) => (
            <OutfitCard key={outfit.id} outfit={outfit} />
          ))}
        </div>
      )}
    </>
  );
}
