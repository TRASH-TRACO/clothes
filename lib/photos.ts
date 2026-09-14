import type { Item, Outfit } from "./types";

type WithPhotos = { photo_path: string | null; photo_paths?: string[] | null };

/**
 * 올린 사진 전부.
 * photo_paths 를 쓰기 전에 저장한 것은 photo_path 한 장만 있다.
 */
function list(row: WithPhotos) {
  if (row.photo_paths?.length) return row.photo_paths;
  return row.photo_path ? [row.photo_path] : [];
}

export function itemPhotos(item: Pick<Item, "photo_path" | "photo_paths">) {
  return list(item);
}

export function outfitPhotos(outfit: Pick<Outfit, "photo_path" | "photo_paths">) {
  return list(outfit);
}
