import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ClosetBrowser } from "@/components/closet-browser";
import { getItems } from "@/lib/data";

export const metadata: Metadata = { title: "옷장" };

export default async function ClosetPage() {
  // 거르기는 화면에서 한다 (components/closet-browser.tsx). 여기서는 통째로 넘긴다.
  // 보관함은 화면에서 가른다 (칩 하나로 바로 오가게)
  const items = await getItems({ sort: "recent", include: "all" });

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">My closet</p>
          <h1 className="display mt-2 text-5xl sm:text-6xl">옷장</h1>
        </div>
        <Link href="/compare" className="text-sm underline underline-offset-4 hover:text-muted">
          실측 비교 →
        </Link>
      </div>

      <Suspense fallback={<div className="h-32" />}>
        <ClosetBrowser items={items} />
      </Suspense>
    </div>
  );
}
