import type { Category } from "./categories";

export type Item = {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  category: Category;
  color_name: string;
  color_hex: string;
  size_label: string | null;
  photo_path: string | null;
  measurements: Record<string, number>;
  notes: string | null;
  created_at: string;
};

export type Outfit = {
  id: string;
  user_id: string;
  name: string;
  memo: string | null;
  /** 착장 사진 (clothes 버킷 경로). 옷 사진과 같은 규칙 */
  photo_path: string | null;
  created_at: string;
};

export type OutfitWithItems = Outfit & {
  items: { slot: Category; item: Item | null }[];
};

/** 서버 액션의 공통 반환 타입 (useActionState) */
export type ActionState = {
  ok: boolean;
  message: string;
} | null;
