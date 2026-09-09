"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { PhotoCropper } from "@/components/photo-cropper";
import { createClient } from "@/lib/supabase/client";
import { PHOTO_BUCKET, photoUrl } from "@/lib/supabase/env";

type Props = {
  userId: string;
  defaultPath?: string | null;
  /** 폼에 실릴 필드 이름 */
  name?: string;
  /** 비어 있을 때 안내 문구 */
  emptyLabel?: string;
  /** 이미지 alt */
  alt?: string;
  /** 미리보기·크롭 비율 (가로 / 세로) */
  aspect?: number;
};

/**
 * 사진은 서버 액션 본문 대신 브라우저에서 바로 Storage로 올린다.
 * 업로드가 끝나면 경로만 hidden input으로 폼에 실린다.
 */
export function PhotoInput({
  userId,
  defaultPath = null,
  name = "photo_path",
  emptyLabel = "탭해서 사진 올리기",
  alt = "등록할 옷 사진",
  aspect = 1,
}: Props) {
  const [path, setPath] = useState<string | null>(defaultPath);
  const [pending, setPending] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const preview = photoUrl(path);

  /** 자르기를 마친 결과만 올린다 */
  async function upload(blob: Blob) {
    setPending(null);
    setStatus("uploading");
    setError("");

    try {
      const key = `${userId}/${crypto.randomUUID()}.jpg`;
      const supabase = createClient();

      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(key, blob, { contentType: "image/jpeg", upsert: false });

      if (uploadError) throw new Error(uploadError.message);

      setPath(key);
      setStatus("idle");
    } catch (cause) {
      setStatus("error");
      setError(
        cause instanceof Error ? cause.message : "업로드에 실패했습니다.",
      );
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={path ?? ""} />

      {pending ? (
        <PhotoCropper
          file={pending}
          aspect={aspect}
          onCancel={() => setPending(null)}
          onDone={(blob) => void upload(blob)}
        />
      ) : (
        <>
          <div
            className="surface relative w-full"
            style={{ aspectRatio: String(aspect) }}
          >
            {preview ? (
              <Image
                src={preview}
                alt={alt}
                fill
                sizes="480px"
                unoptimized
                className="object-cover"
              />
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted transition-colors hover:text-ink"
              >
                <span className="display text-3xl text-line">Photo</span>
                <span className="text-sm">{emptyLabel}</span>
              </button>
            )}

            {status === "uploading" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-paper/80 text-sm font-medium">
                올리는 중…
              </div>
            ) : null}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                setError("");
                setStatus("idle");
                setPending(file);
              }
            }}
          />

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              className="btn-light px-4 py-2 text-sm"
              onClick={() => inputRef.current?.click()}
              disabled={status === "uploading"}
            >
              {path ? "사진 변경" : "사진 선택"}
            </button>
            {path ? (
              <button
                type="button"
                className="text-sm text-muted underline underline-offset-4 hover:text-ink"
                onClick={() => setPath(null)}
              >
                제거
              </button>
            ) : null}
          </div>

          {error ? <p className="mt-2 text-sm text-accent">{error}</p> : null}
        </>
      )}
    </div>
  );
}
