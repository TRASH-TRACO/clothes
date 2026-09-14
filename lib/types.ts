import type { Category } from "./categories";
import type { Felt, Fit, PartFit, Rating } from "./feedback";

export type Item = {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  category: Category;
  /** 세분류 (반팔 티셔츠, 운동화 …). 안 골랐으면 null */
  subcategory: string | null;
  color_name: string;
  color_hex: string;
  size_label: string | null;
  /** 입어보니 품이 어땠는지. 안 적었으면 null */
  fit: Fit | null;
  /** 부위별로 어땠는지 (실측 항목 key → 길다/짧다/크다/작다) */
  fit_notes: Record<string, PartFit>;
  /** 대표 사진. photo_paths 의 첫 장과 같다 */
  photo_path: string | null;
  /** 올린 사진 전부 (대표 포함) */
  photo_paths: string[];
  measurements: Record<string, number>;
  /** 보관함으로 보낸 시각. null 이면 지금 입는 옷 */
  archived_at: string | null;
  notes: string | null;
  created_at: string;
};

/** 코디를 담아 두는 곳. "출근룩", "결혼식룩" 처럼 사람이 직접 만든다 */
export type OutfitFolder = {
  id: string;
  user_id: string;
  name: string;
  /** 사람마다 하나. 지울 수 없고, 갈 곳 없는 코디가 여기로 온다 */
  is_default: boolean;
  created_at: string;
};

export type Outfit = {
  id: string;
  user_id: string;
  /** 선택이다. 안 지었으면 들어간 옷으로 부른다 (lib/outfit-title.ts) */
  name: string | null;
  /** 어느 폴더에 있는지. 폴더를 지우면 잠깐 null 이 됐다가 기본 폴더로 옮겨진다 */
  folder_id: string | null;
  memo: string | null;
  /** 착장 사진 (clothes 버킷 경로). 옷 사진과 같은 규칙 */
  photo_path: string | null;
  /** 입어보고 어땠는지. 안 남겼으면 null */
  rating: Rating | null;
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
  /** 그날 몸으로 느낀 온도. 안 남겼으면 null */
  felt: Felt | null;
  /** 그날 있던 곳. 비어 있으면 기본 지역으로 본다 (여행 간 날만 채운다) */
  place_name: string | null;
  place_lat: number | null;
  place_lon: number | null;
  created_at: string;
};

export type WearLogWithItems = WearLog & {
  items: Item[];
  /**
   * 코디에서 골랐고 그 코디가 아직 남아 있으면 채워진다.
   * title 은 이름을 안 지은 코디까지 부를 수 있게 미리 정해 둔 것 (lib/outfit-title.ts).
   */
  outfit: (Pick<Outfit, "id" | "name" | "photo_path"> & { title: string }) | null;
};

/**
 * 실측 비교 한 번. 일주일치만 남는다 (supabase/schema.sql 11).
 * 견준 쪽이 등록된 옷이면 other_item_id, 아직 안 산 옷이면 other_* 세 칸을 쓴다.
 */
export type CompareLog = {
  id: string;
  user_id: string;
  base_item_id: string;
  other_item_id: string | null;
  other_name: string | null;
  other_category: Category | null;
  other_measurements: Record<string, number>;
  /** 같은 비교를 또 했을 때 줄을 늘리지 않으려고 쓰는 값 (lib/compare.ts) */
  signature: string;
  created_at: string;
};

export type CompareLogWithItems = CompareLog & {
  base: Item | null;
  other: Item | null;
};

/** 서버 액션의 공통 반환 타입 (useActionState) */
export type ActionState = {
  ok: boolean;
  message: string;
  /**
   * 말로만 알려주고 끝내면 안 되는 경우에 붙인다.
   * (같은 조합의 코디가 이미 있을 때 → 그 코디로 가는 길)
   */
  link?: { href: string; label: string };
} | null;
