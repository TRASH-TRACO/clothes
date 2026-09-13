import { NextResponse } from "next/server";

import { buildExport } from "@/lib/export-build";
import { toMarkdown, tidyExport } from "@/lib/export-data";
import { seoulToday } from "@/lib/calendar";
import { getUser } from "@/lib/supabase/server";

/** 내 옷장을 파일로 내려받는다. ?format=md 면 마크다운 */
export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return new NextResponse("로그인이 필요합니다.", { status: 401 });

  const format = new URL(request.url).searchParams.get("format");
  const data = await buildExport();
  const stamp = seoulToday();

  if (format === "md") {
    return new NextResponse(toMarkdown(data), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="closet-${stamp}.md"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(tidyExport(data), null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="closet-${stamp}.json"`,
    },
  });
}
