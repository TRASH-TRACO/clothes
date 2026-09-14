import type { Metadata } from "next";
import Link from "next/link";

import { addOutfitFolder, removeOutfitFolder } from "@/app/actions/outfits";
import { ConfirmForm } from "@/components/confirm-form";
import { OutfitCard } from "@/components/outfit-card";
import { getOutfitFolders, getOutfits } from "@/lib/data";

export const metadata: Metadata = { title: "저장한 코디" };

export default async function OutfitsPage({ searchParams }: PageProps<"/outfits">) {
  const params = await searchParams;
  const [outfits, folders] = await Promise.all([getOutfits(), getOutfitFolders()]);

  const home = folders.find((folder) => folder.is_default) ?? null;
  /**
   * 폴더가 없는 코디는 기본 폴더 것으로 본다.
   * 폴더가 생기기 전에 저장한 코디와, 폴더를 지웠다 옮기기 전의 코디가 여기 해당한다.
   */
  const folderOf = (folderId: string | null) => folderId ?? home?.id ?? "";

  const counts = new Map<string, number>();
  for (const outfit of outfits) {
    const key = folderOf(outfit.folder_id);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const picked = typeof params.f === "string" ? params.f : null;
  const openFolder = folders.find((folder) => folder.id === picked) ?? null;
  const shown = openFolder ? outfits.filter((o) => folderOf(o.folder_id) === openFolder.id) : outfits;

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Saved looks</p>
          <h1 className="display mt-2 text-5xl sm:text-6xl">{openFolder?.name ?? "저장한 코디"}</h1>
        </div>
        <Link href="/studio" className="btn-dark">
          새 코디 만들기
        </Link>
      </div>

      {/* 폴더는 코디를 저장할 때 만들어진다. 하나도 없으면 줄 자체를 안 그린다. */}
      {folders.length > 0 ? (
        <div className="mb-10 flex flex-wrap items-center gap-2">
          <Link href="/outfits" className={`chip ${openFolder ? "" : "chip-active"}`}>
            전체 {outfits.length}
          </Link>
          {folders.map((folder) => (
            <Link
              key={folder.id}
              href={`/outfits?f=${folder.id}`}
              className={`chip ${openFolder?.id === folder.id ? "chip-active" : ""}`}
            >
              {folder.name} {counts.get(folder.id) ?? 0}
            </Link>
          ))}

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

      {shown.length === 0 ? (
        <div className="rounded-xl bg-mist px-6 py-20 text-center">
          <p className="display text-3xl text-line">No looks yet</p>
          <p className="mt-4 text-muted">
            {openFolder ? "이 폴더에는 아직 코디가 없습니다." : "옷장에서 조합해 첫 코디를 저장해보세요."}
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
    </div>
  );
}
