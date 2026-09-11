"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { Item, OutfitWithItems } from "@/lib/types";

type ClosetData = { items: Item[]; outfits: OutfitWithItems[] };

const Ctx = createContext<ClosetData | null>(null);

/**
 * 옷장과 코디 목록은 어느 날짜를 보든 똑같다.
 * 캘린더 레이아웃에서 한 번 실어두고, 날짜를 옮겨 다닐 때는 다시 받지 않는다.
 * (레이아웃은 같은 구역 안에서 화면을 옮겨도 다시 받지 않는다)
 */
export function ClosetDataProvider({
  items,
  outfits,
  children,
}: ClosetData & { children: ReactNode }) {
  const value = useMemo(() => ({ items, outfits }), [items, outfits]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useClosetData() {
  const value = useContext(Ctx);
  if (!value) throw new Error("ClosetDataProvider 안에서만 쓸 수 있습니다.");
  return value;
}
