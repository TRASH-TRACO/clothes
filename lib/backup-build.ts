import "server-only";

import { deflateRawSync } from "node:zlib";

import type { SupabaseClient } from "@supabase/supabase-js";

import { seoulToday } from "./calendar";
import { PHOTO_BUCKET } from "./supabase/env";
import { zip, type ZipEntry } from "./zip";

/**
 * 백업 한 덩어리 만들기.
 *
 * **내보내기와 다르다.** 내보내기(`lib/export-build.ts`)는 다른 AI 에 붙여 넣으라고
 * 만드는 읽을거리라, 최근 180일만 담고 사진도 id 도 없다. 되돌릴 수가 없다.
 * 여기는 **되돌리려고** 만든다 — 전부, id 까지, 사진까지.
 *
 * **API 키는 절대 안 담는다.** `user_settings` 에서 지역 칸만 골라 담는다.
 * 알림 구독도 안 담는다 — 그 기기에서만 쓰는 값이라 옮겨 봐야 쓸 데가 없다.
 */

/** 사진을 이만큼까지만 담는다. 넘으면 남은 건 이름만 적어 둔다 */
const MAX_PHOTO_BYTES = 120 * 1024 * 1024;

/** 한 번에 몇 장씩 받아올지. 너무 많이 한꺼번에 열면 막힌다 */
const PHOTO_BATCH = 6;

/** 백업 형식 번호. 나중에 가져오기를 만들 때 이걸 보고 읽는다 */
export const BACKUP_VERSION = 1;

/**
 * 받아 쓰는 클라이언트.
 *
 * 사람이 직접 내려받을 때는 그 사람 세션으로(RLS 가 남의 것을 막는다), 밤에
 * 혼자 돌 때는 service_role 로 온다. 어느 쪽이든 user_id 를 **직접 적어서**
 * 거른다 — RLS 에만 기대면 service_role 로 돌 때 남의 것까지 담긴다.
 */
type Client = SupabaseClient;

export type BackupSummary = {
  옷: number;
  코디: number;
  폴더: number;
  착용기록: number;
  장바구니: number;
  날씨: number;
  사진: number;
  /** 너무 커서 못 담은 사진 수 */
  못담은사진: number;
  바이트: number;
};

/** 한 테이블 통째로. 없는 테이블(스키마를 아직 안 올린 경우)은 빈 배열로 넘긴다 */
async function rows(client: Client, table: string, columns: string, userId: string) {
  const { data, error } = await client.from(table).select(columns).eq("user_id", userId);
  if (error) return [];
  return (data ?? []) as unknown as Record<string, unknown>[];
}

/** 사진 경로를 중복 없이 모은다 */
function photoPaths(groups: Record<string, unknown>[][]): string[] {
  const out = new Set<string>();
  for (const group of groups) {
    for (const row of group) {
      const one = row.photo_path;
      if (typeof one === "string" && one) out.add(one);
      const many = row.photo_paths;
      if (Array.isArray(many)) {
        for (const path of many) if (typeof path === "string" && path) out.add(path);
      }
    }
  }
  return [...out];
}

export async function buildBackup(
  client: Client,
  userId: string,
): Promise<{ file: Uint8Array; name: string; summary: BackupSummary }> {
  const [items, outfits, folders, logs, cart, weather, settings] = await Promise.all([
    rows(client, "items", "*", userId),
    rows(client, "outfits", "*", userId),
    rows(client, "outfit_folders", "*", userId),
    rows(client, "wear_logs", "*", userId),
    rows(client, "cart_items", "*", userId),
    rows(client, "daily_weather", "*", userId),
    // **키 칸은 안 고른다.** `*` 로 긁으면 anthropic_key_cipher 가 딸려 온다.
    rows(client, "user_settings", "user_id, place_name, place_lat, place_lon, updated_at", userId),
  ]);

  // 이어 붙는 줄들은 부모 id 로 묶여 있어서 user_id 가 없다. 부모를 따라 받는다.
  const outfitIds = new Set(outfits.map((row) => String(row.id)));
  const logIds = new Set(logs.map((row) => String(row.id)));
  const [outfitItems, logItems] = await Promise.all([
    children(client, "outfit_items", "outfit_id", outfitIds),
    children(client, "wear_log_items", "wear_log_id", logIds),
  ]);

  const paths = photoPaths([items, outfits, cart]);
  const photos: ZipEntry[] = [];
  const missed: string[] = [];
  let total = 0;

  for (let at = 0; at < paths.length; at += PHOTO_BATCH) {
    const batch = paths.slice(at, at + PHOTO_BATCH);
    const got = await Promise.all(
      batch.map(async (path) => {
        if (total >= MAX_PHOTO_BYTES) return { path, data: null };
        const { data } = await client.storage.from(PHOTO_BUCKET).download(path);
        if (!data) return { path, data: null };
        return { path, data: new Uint8Array(await data.arrayBuffer()) };
      }),
    );
    for (const one of got) {
      if (!one.data) {
        missed.push(one.path);
        continue;
      }
      total += one.data.length;
      // 사진은 이미 압축돼 있다. 다시 압축해 봐야 시간만 쓴다.
      photos.push({ name: `photos/${one.path}`, data: one.data });
    }
  }

  const stamp = seoulToday();
  const manifest = {
    형식: BACKUP_VERSION,
    만든날: stamp,
    만든때: new Date().toISOString(),
    주의: "이 파일에는 API 키와 알림 구독이 들어 있지 않습니다.",
    못담은사진: missed,
    옷: items,
    코디: outfits,
    코디구성: outfitItems,
    폴더: folders,
    착용기록: logs,
    착용기록옷: logItems,
    장바구니: cart,
    날씨: weather,
    설정: settings,
  };

  const entries: ZipEntry[] = [
    {
      name: "manifest.json",
      data: new TextEncoder().encode(JSON.stringify(manifest, null, 2)),
      deflate: true,
    },
    { name: "읽어보세요.txt", data: new TextEncoder().encode(readme(stamp)), deflate: true },
    ...photos,
  ];

  const file = zip(entries, (data) => new Uint8Array(deflateRawSync(data)));

  return {
    file,
    name: `closet-backup-${stamp}.zip`,
    summary: {
      옷: items.length,
      코디: outfits.length,
      폴더: folders.length,
      착용기록: logs.length,
      장바구니: cart.length,
      날씨: weather.length,
      사진: photos.length,
      못담은사진: missed.length,
      바이트: file.length,
    },
  };
}

/** 부모 id 로 묶인 줄들. in() 은 한 번에 너무 많이 못 넣으므로 나눠 받는다 */
async function children(
  client: Client,
  table: string,
  column: string,
  parents: Set<string>,
): Promise<Record<string, unknown>[]> {
  const list = [...parents];
  const out: Record<string, unknown>[] = [];
  for (let at = 0; at < list.length; at += 200) {
    const { data, error } = await client
      .from(table)
      .select("*")
      .in(column, list.slice(at, at + 200));
    if (error) return out;
    out.push(...((data ?? []) as Record<string, unknown>[]));
  }
  return out;
}

function readme(stamp: string) {
  return [
    `CLOSET 백업 — ${stamp}`,
    "",
    "manifest.json  옷·코디·착용기록·장바구니·날씨·폴더·설정이 통째로 들어 있습니다.",
    "photos/        그때까지 올린 사진 전부. 경로는 Storage 에 있던 그대로입니다.",
    "",
    "이 파일에는 API 키와 알림 구독이 들어 있지 않습니다.",
    "",
    "되돌리려면 manifest.json 의 줄을 그대로 다시 넣으면 됩니다 (id 까지 들어 있습니다).",
    "앱에 아직 '가져오기' 화면은 없습니다.",
  ].join("\n");
}
