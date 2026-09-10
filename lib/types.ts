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

/** 그날 뭘 입었는지. 하루에 한 줄 (user_id + worn_on 유니크) */
export type WearLog = {
  id: string;
  user_id: string;
  /** YYYY-MM-DD */
  worn_on: string;
  /** 저장한 코디에서 골랐으면 그 코디 id */
  outfit_id: string | null;
  memo: string | null;
  created_at: string;
};

export type WearLogWithItems = WearLog & {
  items: Item[];
  /** 코디에서 골랐고 그 코디가 아직 남아 있으면 채워진다 */
  outfit: Pick<Outfit, "id" | "name" | "photo_path"> | null;
};

/** 서버 액션의 공통 반환 타입 (useActionState) */
export type ActionState = {
  ok: boolean;
  message: string;
} | null;
