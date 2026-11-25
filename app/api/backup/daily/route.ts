import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { buildBackup } from "@/lib/backup-build";
import { seoulToday } from "@/lib/calendar";
import { BACKUP_BUCKET, KEEP_DAYS, backupPath, prune } from "@/lib/backup-store";
import { createAdminClient, hasAdminKey } from "@/lib/supabase/admin";

/** 사람마다 사진을 받아 묶는다. 수가 늘면 그만큼 걸린다 */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * 밤마다 백업을 한 덩어리로 묶어 Storage 에 둔다 (vercel.json 의 crons).
 *
 * **사람이 아무것도 안 해도 쌓인다.** 폰을 잃어버려도, 실수로 다 지워도
 * 어제 것이 남아 있다.
 *
 * 다만 이것만으로는 부족하다 — 같은 Supabase 프로젝트 안이라 프로젝트가 통째로
 * 날아가면 백업도 같이 날아간다. 그래서 설정 화면에서 손으로 내려받는 길
 * (`/api/backup`)을 같이 둔다. 한 달에 한 번쯤은 밖에 두는 게 맞다.
 *
 * 로그인한 사람이 없는 일이라 CRON_SECRET 으로 막는다 (알림과 같은 방식).
 */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  if (!hasAdminKey()) {
    // 환경변수를 아직 안 넣었으면 조용히 넘어간다. 매일 500 을 남길 일이 아니다.
    return NextResponse.json({ ok: false, reason: "not_configured" });
  }

  const supabase = createAdminClient();

  // 백업할 게 있는 사람만 돈다. 가입만 하고 안 쓰는 사람까지 매일 묶을 이유가 없다.
  const { data, error } = await supabase.from("items").select("user_id");
  if (error) return NextResponse.json({ ok: false, reason: error.message }, { status: 500 });

  const users = [...new Set((data ?? []).map((row) => String(row.user_id)))];
  if (users.length === 0) return NextResponse.json({ ok: true, saved: 0, failed: 0 });

  const stamp = seoulToday();
  let saved = 0;
  const failed: string[] = [];

  for (const userId of users) {
    try {
      const { file } = await buildBackup(supabase, userId);
      const { error: upload } = await supabase.storage
        .from(BACKUP_BUCKET)
        .upload(backupPath(userId, stamp), file, {
          contentType: "application/zip",
          // 같은 날 두 번 돌면 덮어쓴다. 날짜별로 하나면 된다.
          upsert: true,
        });
      if (upload) throw new Error(upload.message);
      saved += 1;
      await prune(supabase, userId);
    } catch (cause) {
      // 한 사람이 실패해도 나머지는 묶는다
      failed.push(userId);
      console.error("[backup]", userId, cause instanceof Error ? cause.message : cause);
    }
  }

  return NextResponse.json({ ok: true, saved, failed: failed.length, keep: KEEP_DAYS });
}

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  if (!secret) return false;
  const sent = request.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  // 글자 길이로 답이 새지 않게 길이를 맞춰 놓고 비교한다
  if (sent.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(sent), Buffer.from(want));
}
