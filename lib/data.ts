import "server-only";

import { cache } from "react";

import { SLOT_ORDER, type Category } from "./categories";
import { isSupabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";
import type { Item, Outfit, OutfitWithItems } from "./types";

export type ItemQuery = {
  category?: Category;
  color?: string;
  q?: string;
  sort?: "recent" | "name";
};

export const getItems = cache(async (query: ItemQuery = {}): Promise<Item[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  let builder = supabase.from("items").select("*");

  if (query.category) builder = builder.eq("category", query.category);
  if (query.color) builder = builder.eq("color_name", query.color);
  if (query.q) {
    // PostgREST 필터 문법을 깨뜨리는 문자는 제거한다
    const term = query.q.replace(/[,()*\\]/g, "").trim();
    if (term) builder = builder.or(`name.ilike.%${term}%,brand.ilike.%${term}%`);
  }

  builder =
    query.sort === "name"
      ? builder.order("name", { ascending: true })
      : builder.order("created_at", { ascending: false });

  const { data, error } = await builder;
  if (error) throw new Error(error.message);
  return (data ?? []) as Item[];
});

export const getItem = cache(async (id: string): Promise<Item | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("items").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Item) ?? null;
});

/** 옷장에 실제로 등록된 색상 목록 (필터용) */
export async function getColorFacets() {
  const items = await getItems();
  const map = new Map<string, { name: string; hex: string; count: number }>();
  for (const item of items) {
    const found = map.get(item.color_name);
    if (found) found.count += 1;
    else map.set(item.color_name, { name: item.color_name, hex: item.color_hex, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export async function getCategoryCounts() {
  const items = await getItems();
  const counts = {} as Record<Category, number>;
  for (const slot of SLOT_ORDER) counts[slot] = 0;
  for (const item of items) counts[item.category] += 1;
  return counts;
}

type OutfitRow = Outfit & {
  outfit_items: { slot: Category; items: Item | null }[];
};

const OUTFIT_SELECT = "*, outfit_items(slot, items(*))";

function toOutfit(row: OutfitRow): OutfitWithItems {
  const bySlot = new Map(row.outfit_items.map((entry) => [entry.slot, entry.items]));
  return {
    ...row,
    items: SLOT_ORDER.filter((slot) => bySlot.has(slot)).map((slot) => ({
      slot,
      item: bySlot.get(slot) ?? null,
    })),
  };
}

export const getOutfits = cache(async (): Promise<OutfitWithItems[]> => {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outfits")
    .select(OUTFIT_SELECT)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as OutfitRow[]).map(toOutfit);
});

export const getOutfit = cache(async (id: string): Promise<OutfitWithItems | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outfits")
    .select(OUTFIT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toOutfit(data as OutfitRow) : null;
});
