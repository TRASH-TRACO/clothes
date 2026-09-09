import { NextResponse } from "next/server";

import { PHOTO_BUCKET } from "@/lib/supabase/env";
import { createClient, getUser } from "@/lib/supabase/server";

/**
 * 사진 버킷이 private이라 공개 URL이 없다.
 * 로그인한 본인 폴더(<uid>/…)의 파일만 여기서 인증을 거쳐 스트리밍한다.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;

  const user = await getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  // 상위 경로 탈출 차단
  if (path.some((segment) => segment === "." || segment === "..")) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  // Storage 정책과 같은 규칙: 첫 폴더가 본인 uid여야 한다.
  // (RLS도 막지만, 남의 경로면 왕복 없이 여기서 끝낸다)
  if (path[0] !== user.id) return new NextResponse("Not Found", { status: 404 });

  const supabase = await createClient();
  const { data, error } = await supabase.storage.from(PHOTO_BUCKET).download(path.join("/"));

  if (error || !data) return new NextResponse("Not Found", { status: 404 });

  return new NextResponse(data.stream(), {
    headers: {
      "Content-Type": data.type || "image/jpeg",
      "Content-Length": String(data.size),
      // 경로에 uuid가 박혀 있어 같은 URL의 내용은 바뀌지 않는다. 공유 캐시에는 두지 않는다.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
