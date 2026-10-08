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
 * 지금 보고 있는 사진을 내려받는 주소.
 *
 * 저장될 이름은 **옷·코디 이름**으로 짓는다. 저장해 둔 경로에는 uuid 가 박혀 있어서
 * 그대로 받으면 사진첩에 `a3f2….jpg` 가 쌓인다. 여러 장이면 뒤에 번호를 붙인다.
 */
function downloadHref(path: string, alt: string, index: number, total: number) {
  const name = total > 1 ? `${alt} ${index + 1}` : alt;
  return `${photoUrl(path)}?download=1&name=${encodeURIComponent(name)}`;
}

/**
 * 옷 사진 넘겨 보기.
 * 옆으로 밀어 넘기고(스크롤 스냅), 아래 점으로 위치를 보여준다.
 * 오른쪽 아래 버튼으로 **보고 있는 사진을 내려받는다.**
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

  // 스크롤 중에 범위 밖을 가리킬 수 있다
  const shown = Math.min(Math.max(current, 0), paths.length - 1);

  return (
    <div>
      <div className="relative">
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

      {/* 내려받기. 사진 위에 올려 둬야 어느 사진을 받는지가 분명하다 */}
      <a
        href={downloadHref(paths[shown], alt, shown, paths.length)}
        download
        aria-label={paths.length > 1 ? `${shown + 1}번째 사진 내려받기` : "사진 내려받기"}
        className="absolute bottom-3 right-3 rounded-full bg-paper/85 p-2.5 text-ink shadow-sm
          backdrop-blur-sm transition-colors hover:bg-paper"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-5 w-5"
        >
          <path d="M12 4v11" />
          <path d="M7.5 10.5 12 15l4.5-4.5" />
          <path d="M5 19h14" />
        </svg>
      </a>
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
