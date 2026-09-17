import type { Metadata } from "next";

import { OutfitBrowser } from "@/components/outfit-browser";
import { getOutfitFolders, getOutfits } from "@/lib/data";

export const metadata: Metadata = { title: "저장한 코디" };

/**
 * 한 번에 다 받아 두고 거르기는 화면에서 한다 (components/outfit-browser.tsx).
 * 그래서 이 화면은 주소의 `?f=`·`?r=` 을 읽지 않는다 — 읽으면 폴더를 옮길 때마다
 * 서버를 다시 부르게 되고, 이미 손에 있는 목록을 또 받아오게 된다.
 */
export default async function OutfitsPage() {
  const [outfits, folders] = await Promise.all([getOutfits(), getOutfitFolders()]);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
      <OutfitBrowser outfits={outfits} folders={folders} />
    </div>
  );
}
