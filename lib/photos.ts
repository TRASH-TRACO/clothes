import type { Item } from "./types";

/**
 * 옷에 올린 사진 전부.
 * photo_paths 를 쓰기 전에 등록한 옷은 photo_path 한 장만 있다.
 */
export function itemPhotos(item: Pick<Item, "photo_path" | "photo_paths">) {
  if (item.photo_paths?.length) return item.photo_paths;
  return item.photo_path ? [item.photo_path] : [];
}
