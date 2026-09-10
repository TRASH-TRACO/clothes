import "server-only";

import { cache } from "react";

import { SLOT_ORDER, type Category } from "./categories";
import { DEFAULT_PLACE, isPlace, roundPlace, type Place } from "./places";
import { isSupabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";
import type { Item, Outfit, OutfitWithItems, WearLog, WearLogWithItems } from "./types";

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

/** 이미 등록된 브랜드 목록 (많이 쓴 순). 오타로 중복이 늘지 않게 고르는 용도 */
export async function getBrands() {
  const items = await getItems();
  const map = new Map<string, { name: string; count: number }>();
  for (const item of items) {
    const brand = item.brand?.trim();
    if (!brand) continue;
    // 표기가 갈려도 한 줄로 모은다 (Carhartt / carhartt)
    const key = brand.toLowerCase();
    const found = map.get(key);
    if (found) found.count += 1;
    else map.set(key, { name: brand, count: 1 });
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
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

/**
 * schema.sql 의 착장 기록 부분을 아직 안 돌렸으면 테이블이 없다.
 * 그때 캘린더 전체가 죽는 대신 빈 화면으로 두고, 저장할 때 진짜 이유를 보여준다.
 */
function isMissingTable(error: { code?: string } | null) {
  return error?.code === "42P01";
}

type WearLogRow = WearLog & {
  outfits: Pick<Outfit, "id" | "name" | "photo_path"> | null;
  wear_log_items: { items: Item | null }[];
};

const WEAR_SELECT = "*, outfits(id, name, photo_path), wear_log_items(items(*))";

function toWearLog(row: WearLogRow): WearLogWithItems {
  return {
    ...row,
    outfit: row.outfits,
    // 코디 슬롯 순서대로 세워야 카드가 늘 같은 순서로 보인다
    items: row.wear_log_items
      .map((entry) => entry.items)
      .filter((item): item is Item => item !== null)
      .sort((a, b) => SLOT_ORDER.indexOf(a.category) - SLOT_ORDER.indexOf(b.category)),
  };
}

/** 달력 한 판에 뿌릴 기록. from/to 는 YYYY-MM-DD (양 끝 포함) */
export const getWearLogs = cache(
  async (from: string, to: string): Promise<WearLogWithItems[]> => {
    if (!isSupabaseConfigured()) return [];
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("wear_logs")
      .select(WEAR_SELECT)
      .gte("worn_on", from)
      .lte("worn_on", to)
      .order("worn_on", { ascending: true });
    if (isMissingTable(error)) return [];
    if (error) throw new Error(error.message);
    return ((data ?? []) as WearLogRow[]).map(toWearLog);
  },
);

export const getWearLog = cache(async (date: string): Promise<WearLogWithItems | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wear_logs")
    .select(WEAR_SELECT)
    .eq("worn_on", date)
    .maybeSingle();
  if (isMissingTable(error)) return null;
  if (error) throw new Error(error.message);
  return data ? toWearLog(data as WearLogRow) : null;
});

/** 환경변수로 박아둔 기본 지역 (설정 화면을 아직 안 쓴 경우의 대비책) */
function envPlace(): Place | null {
  const place = {
    name: process.env.WEATHER_CITY || "기본 지역",
    lat: Number(process.env.WEATHER_LAT),
    lon: Number(process.env.WEATHER_LON),
  };
  return isPlace(place) ? roundPlace(place) : null;
}

/**
 * 날씨를 볼 기본 지역.
 * 접속 위치로 추정하지 않는다. 날씨는 그날의 기록이라 추정값이 남으면 곤란하다.
 */
export const getBasePlace = cache(async (): Promise<Place> => {
  const fallback = envPlace() ?? DEFAULT_PLACE;
  if (!isSupabaseConfigured()) return fallback;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_settings")
    .select("place_name, place_lat, place_lon")
    .maybeSingle();

  if (error || !data) return fallback;

  const place = { name: data.place_name, lat: data.place_lat, lon: data.place_lon };
  return isPlace(place) ? roundPlace(place) : fallback;
});

/** 기본 지역을 직접 정해 뒀는지 (안 정했으면 설정하라고 안내한다) */
export const hasBasePlace = cache(async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;
  const supabase = await createClient();
  const { data, error } = await supabase.from("user_settings").select("user_id").maybeSingle();
  return !error && Boolean(data);
});

/** 그날 따로 적어 둔 지역 (여행 등). 없으면 null */
export function logPlace(log: WearLog | null | undefined): Place | null {
  if (!log) return null;
  const place = { name: log.place_name, lat: log.place_lat, lon: log.place_lon };
  return isPlace(place) ? roundPlace(place) : null;
}
