"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { PhotoCropper } from "@/components/photo-cropper";
import { createClient } from "@/lib/supabase/client";
import { PHOTO_BUCKET, photoUrl } from "@/lib/supabase/env";

type Props = {
  userId: string;
  defaultPaths?: string[];
  /** 미리보기·자르기 비율 */
  aspect?: number;
  /** 장수가 바뀔 때. 단계별 등록에서 "사진 올렸는지"를 알아야 한다 */
  onChange?: (paths: string[]) => void;
  /**
   * 자르는 중이거나 올리는 중일 때. 폼이 저장 버튼을 잠그는 데 쓴다.
   * 아직 손에 든 사진이 있는데 저장만 되고 끝나면 안 된다.
   */
  onBusy?: (busy: boolean) => void;
};

/** 한 옷에 올릴 수 있는 사진 수. 너무 많으면 고르기도 보기도 번거롭다 */
const MAX = 8;

/**
 * 옷 사진 여러 장.
 * 첫 장이 대표 사진이고, 목록·카드에는 그것만 보인다.
 */
export function PhotoListInput({
  userId,
  defaultPaths = [],
  aspect = 1,
  onChange,
  onBusy,
}: Props) {
  const [paths, setPaths] = useState<string[]>(defaultPaths);
  const [pending, setPending] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  /** 사진 한 장이 아직 손 안에 있다 (자르는 중 / 올리는 중) */
  const busy = pending !== null || status === "uploading";
  useEffect(() => {
    onBusy?.(busy);
  }, [busy, onBusy]);

  function update(next: string[]) {
    setPaths(next);
    onChange?.(next);
  }

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

      // 올리는 동안 버튼이 잠겨 있어 paths 가 밀릴 일은 없다
      update([...paths, key].slice(0, MAX));
      setStatus("idle");
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "업로드에 실패했습니다.");
    }
  }

  function makeCover(path: string) {
    update([path, ...paths.filter((value) => value !== path)]);
  }

  function remove(path: string) {
    update(paths.filter((value) => value !== path));
  }

  /**
   * 폼에 실리는 칸. **자르기 창을 열어도 그대로 있어야 한다.**
   *
   * 예전에는 자르는 동안 이 컴포넌트가 자르기 창만 돌려줬다. 그러면 지금까지
   * 올려 둔 사진이 폼에서 통째로 사라진다 — 수정 화면은 저장 버튼이 아래에
   * 같이 떠 있어서, 자르기 창을 열어 둔 채 저장을 누르면 **원래 있던 사진이
   * 전부 떨어져 나간 채로 저장됐다.** (파일은 Storage 에 남지만 옷에서는 끊긴다)
   *
   * 저장 버튼도 잠그지만(onBusy), 눌려도 잃는 게 없어야 한다.
   */
  const fields = paths.map((path) => (
    <input key={path} type="hidden" name="photo_paths" value={path} />
  ));

  if (pending) {
    return (
      <div>
        {fields}
        <PhotoCropper
          file={pending}
          aspect={aspect}
          onCancel={() => setPending(null)}
          onDone={(blob) => void upload(blob)}
        />
      </div>
    );
  }

  return (
    <div>
      {fields}

      <div className="grid grid-cols-3 gap-2">
        {paths.map((path, index) => (
          <div key={path} className="group relative">
            <div className="surface relative" style={{ aspectRatio: String(aspect) }}>
              <Image
                src={photoUrl(path)!}
                alt={index === 0 ? "대표 사진" : `사진 ${index + 1}`}
                fill
                sizes="200px"
                unoptimized
                className="object-cover"
              />
              {index === 0 ? (
                <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-1 text-[10px] font-semibold text-paper">
                  대표
                </span>
              ) : null}
            </div>

            <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
              {index === 0 ? (
                <span className="text-muted">첫 장이 대표</span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeCover(path)}
                  className="underline underline-offset-2 hover:text-ink"
                >
                  대표로
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(path)}
                className="text-muted underline underline-offset-2 hover:text-accent"
              >
                삭제
              </button>
            </div>
          </div>
        ))}

        {paths.length < MAX ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={status === "uploading"}
            className="surface flex flex-col items-center justify-center gap-1 border border-dashed
              border-line text-muted transition-colors hover:border-ink hover:text-ink"
            style={{ aspectRatio: String(aspect) }}
          >
            {status === "uploading" ? (
              <span className="text-sm font-medium">올리는 중…</span>
            ) : (
              <>
                <span className="display text-2xl text-line">+</span>
                <span className="text-xs">{paths.length === 0 ? "사진 올리기" : "추가"}</span>
              </>
            )}
          </button>
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

      <p className="mt-3 text-xs text-muted">
        최대 {MAX}장. 첫 장이 목록에 보이는 대표 사진입니다.
      </p>
      {status === "error" ? <p className="mt-2 text-sm text-accent">{error}</p> : null}
    </div>
  );
}
