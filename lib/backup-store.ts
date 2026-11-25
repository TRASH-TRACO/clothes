import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * 서버에 쌓이는 백업을 다루는 곳.
 *
 * **사진 버킷과 따로 둔다.** 같은 버킷에 두면 사진을 지우는 코드가 백업까지
 * 건드릴 수 있고, 사진을 읽는 `/api/photo` 가 백업도 내주게 된다.
 */
export const BACKUP_BUCKET = "backups";

/** 며칠치를 둘지. 그 전 것은 밤에 돌면서 지운다 */
export const KEEP_DAYS = 30;

/** `<user_id>/2026-11-25.zip`. 사진과 같은 규칙이라 정책도 같은 모양이다 */
export function backupPath(userId: string, stamp: string) {
  return `${userId}/${stamp}.zip`;
}

export type StoredBackup = {
  /** 파일 이름 (2026-11-25.zip) */
  name: string;
  /** YYYY-MM-DD */
  date: string;
  bytes: number | null;
  createdAt: string | null;
};

/** 날짜가 이름이므로 글자 순서가 곧 날짜 순서다 (최근 것이 앞) */
export async function listBackups(
  client: SupabaseClient,
  userId: string,
): Promise<StoredBackup[]> {
  const { data, error } = await client.storage.from(BACKUP_BUCKET).list(userId, {
    limit: 100,
    sortBy: { column: "name", order: "desc" },
  });
  // 버킷을 아직 안 만들었으면 목록만 안 보이고 나머지 화면은 그대로 돈다
  if (error || !data) return [];

  return data
    .filter((file) => file.name.endsWith(".zip"))
    .map((file) => ({
      name: file.name,
      date: file.name.replace(/\.zip$/, ""),
      bytes:
        typeof (file.metadata as { size?: unknown } | null)?.size === "number"
          ? ((file.metadata as { size: number }).size as number)
          : null,
      createdAt: file.created_at ?? null,
    }));
}

/** KEEP_DAYS 보다 오래된 것을 지운다. 이름이 날짜라 세어 보면 된다 */
export async function prune(client: SupabaseClient, userId: string) {
  const files = await listBackups(client, userId);
  const old = files.slice(KEEP_DAYS);
  if (old.length === 0) return 0;
  await client.storage.from(BACKUP_BUCKET).remove(old.map((file) => `${userId}/${file.name}`));
  return old.length;
}
