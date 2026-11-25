import { NextResponse } from "next/server";

import { buildBackup } from "@/lib/backup-build";
import { createClient, getUser } from "@/lib/supabase/server";

/** 사람 수대로 다르다. 사진이 많으면 묶는 데 시간이 걸린다 */
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * 지금 이 순간의 백업을 ZIP 으로 내려준다.
 *
 * 밤에 서버가 혼자 만드는 것(`/api/backup/daily`)과 **같은 함수**로 만든다.
 * 둘이 다르면 한쪽만 고쳐 놓고 모르는 일이 생긴다.
 */
export async function GET() {
  const user = await getUser();
  if (!user) return new NextResponse("로그인이 필요합니다.", { status: 401 });

  const supabase = await createClient();
  const { file, name } = await buildBackup(supabase, user.id);

  // 담은 수를 헤더로 같이 보내고 싶었는데, HTTP 헤더는 ASCII 만 받는다
  // (칸 이름이 한글이라 그대로 넣으면 500 이 난다). 쓸 데도 없어서 뺐다.

  return new NextResponse(file as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(file.length),
      "Content-Disposition": `attachment; filename="${name}"`,
      // 묶는 데 든 품을 캐시가 가로채면 어제 것을 받게 된다
      "Cache-Control": "no-store",
    },
  });
}
