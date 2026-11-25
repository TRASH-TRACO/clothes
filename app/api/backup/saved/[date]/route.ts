import { NextResponse } from "next/server";

import { BACKUP_BUCKET, backupPath } from "@/lib/backup-store";
import { isValidDate } from "@/lib/calendar";
import { createClient, getUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * 밤에 서버가 묶어 둔 백업을 내려준다.
 *
 * 버킷이 private 이라 공개 주소가 없다. 사진(`/api/photo`)과 같은 방식으로,
 * 로그인 세션으로 대신 받아서 넘겨준다. 남의 것은 RLS 가 막지만 경로에
 * 본인 id 를 직접 박아서 한 번 더 막는다.
 */
export async function GET(_request: Request, { params }: RouteContext<"/api/backup/saved/[date]">) {
  const user = await getUser();
  if (!user) return new NextResponse("로그인이 필요합니다.", { status: 401 });

  const { date } = await params;
  if (!isValidDate(date)) return new NextResponse("잘못된 요청입니다.", { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BACKUP_BUCKET)
    .download(backupPath(user.id, date));

  if (error || !data) return new NextResponse("그 날짜의 백업이 없습니다.", { status: 404 });

  return new NextResponse(data.stream() as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="closet-backup-${date}.zip"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
