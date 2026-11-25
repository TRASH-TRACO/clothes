"use client";

import { useState } from "react";

import type { StoredBackup } from "@/lib/backup-store";

/** 1.2MB 처럼 읽기 좋게 */
function size(bytes: number | null) {
  if (bytes === null) return null;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

/** 2026-11-25 → 11월 25일 */
function label(date: string) {
  const [, month, day] = date.split("-");
  if (!month || !day) return date;
  return `${Number(month)}월 ${Number(day)}일`;
}

/**
 * 백업 받는 자리.
 *
 * 지금 묶어서 받는 길과, 밤에 서버가 묶어 둔 것을 받는 길 둘 다 둔다.
 * 서버에 쌓이는 것만으로는 부족하다 — 같은 Supabase 프로젝트 안이라 프로젝트가
 * 통째로 날아가면 백업도 같이 날아간다. 가끔은 밖에 둬야 한다.
 */
export function BackupPanel({ saved }: { saved: StoredBackup[] }) {
  const [busy, setBusy] = useState(false);

  return (
    <div>
      <a
        href="/api/backup"
        download
        onClick={() => {
          // 사진까지 묶어 보내는 길이라 몇 초 걸린다. 누른 줄 모르고 또 누르면
          // 서버가 두 번 묶는다.
          setBusy(true);
          setTimeout(() => setBusy(false), 8000);
        }}
        className="btn-dark px-6 py-3"
        aria-disabled={busy}
      >
        {busy ? "묶는 중… (몇 초 걸립니다)" : "지금 백업 내려받기"}
      </a>

      <div className="mt-6">
        <p className="label mb-2">서버에 쌓인 백업</p>
        {saved.length === 0 ? (
          <p className="rounded-xl bg-mist px-5 py-4 text-sm text-muted">
            아직 없습니다. 매일 새벽에 하나씩 쌓이고 30일치가 남습니다.{" "}
            <span className="block mt-1">
              하나도 안 쌓인다면 <code className="rounded bg-paper px-1.5 py-0.5">backups</code>{" "}
              버킷(schema.sql 20번)과{" "}
              <code className="rounded bg-paper px-1.5 py-0.5">CRON_SECRET</code>·
              <code className="rounded bg-paper px-1.5 py-0.5">SUPABASE_SERVICE_ROLE_KEY</code> 가
              있는지 확인해 주세요.
            </span>
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {saved.map((file) => (
              <li key={file.name} className="flex items-center gap-3 px-4 py-3">
                <span className="font-medium">{label(file.date)}</span>
                {size(file.bytes) ? (
                  <span className="text-sm text-muted">{size(file.bytes)}</span>
                ) : null}
                <a
                  href={`/api/backup/saved/${file.date}`}
                  download
                  className="ml-auto text-sm underline underline-offset-4 hover:text-muted"
                >
                  내려받기
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
