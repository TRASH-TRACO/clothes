"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { CATEGORY_META, type Category } from "@/lib/categories";
import { photoUrl } from "@/lib/supabase/env";

type Props = {
  paths: string[];
  alt: string;
  /**
   * 사진이 없을 때 대신 보여줄 분류 (옷 상세).
   * 코디 착장 사진처럼 없으면 아예 안 그려야 하는 쪽에서는 안 넘긴다.
   */
  category?: Category;
  /** 사진 비율. 옷은 정사각, 착장은 3:4 */
  aspect?: string;
};

/**
 * 옷 사진 넘겨 보기.
 * 옆으로 밀어 넘기고(스크롤 스냅), 아래 점으로 위치를 보여준다.
 */
export function PhotoCarousel({ paths, alt, category, aspect = "aspect-square" }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);

  if (paths.length === 0) {
    if (!category) return null;
    return (
      <div className={`surface flex ${aspect} items-center justify-center rounded-2xl`}>
        <span className="display text-2xl text-line">{CATEGORY_META[category].en}</span>
      </div>
    );
  }

  function go(index: number) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: track.clientWidth * index, behavior: "smooth" });
  }

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={(event) => {
          const track = event.currentTarget;
          setCurrent(Math.round(track.scrollLeft / track.clientWidth));
        }}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-2xl"
      >
        {paths.map((path, index) => (
          <div key={path} className={`relative ${aspect} w-full shrink-0 snap-center bg-mist`}>
            <Image
              src={photoUrl(path)!}
              alt={paths.length > 1 ? `${alt} ${index + 1}/${paths.length}` : alt}
              fill
              sizes="(max-width: 1024px) 100vw, 640px"
              priority={index === 0}
              unoptimized
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {paths.length > 1 ? (
        <div className="mt-4 flex items-center justify-center gap-2">
          {paths.map((path, index) => (
            <button
              key={path}
              type="button"
              onClick={() => go(index)}
              aria-label={`${index + 1}번째 사진`}
              aria-current={index === current}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === current ? "bg-ink" : "bg-line hover:bg-muted"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
