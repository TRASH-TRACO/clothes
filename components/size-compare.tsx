"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";

import { compareSize, type SizeState } from "@/app/actions/size";
import { CATEGORY_META, SLOT_ORDER, kindsOf, type Category } from "@/lib/categories";
import { shrinkForReading, toBase64 } from "@/lib/image";
import type { Item } from "@/lib/types";

const MAX_IMAGES = 3;

type Shot = { id: string; preview: string; data: string };

/**
 * 사려는 옷의 실측표 사진을 올려 가지고 있는 옷과 견준다.
 *
 * 사진은 브라우저에서 줄여서 base64 로 폼에 싣는다. Storage 에 올리지 않는 이유:
 * 사려다 만 옷 사진이 옷장 버킷에 쌓일 이유가 없다. 한 번 보고 끝이다.
 */
export function SizeCompare({ items }: { items: Item[] }) {
  const [state, formAction, pending] = useActionState<SizeState, FormData>(compareSize, null);
  const [category, setCategory] = useState<Category>("top");
  const [shots, setShots] = useState<Shot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<string | null>(null);

  /**
   * 견줄 옷은 안 고르게 한다. 같은 분류를 통째로 넘기고 AI 가 고른다 —
   * 어느 옷이 견줄 만한지는 실측과 사이즈감을 다 보고 있는 쪽이 더 잘 안다.
   * 여기서는 몇 벌이 넘어가는지만 알려준다.
   */
  const ready = items.filter(
    (item) => item.category === category && Object.keys(item.measurements ?? {}).length > 0,
  ).length;

  async function addFiles(files: File[]) {
    setBusy(true);
    setError("");
    try {
      const room = MAX_IMAGES - shots.length;
      const next: Shot[] = [];
      for (const file of files.slice(0, room)) {
        const { blob } = await shrinkForReading(file);
        next.push({
          id: crypto.randomUUID(),
          preview: URL.createObjectURL(blob),
          data: await toBase64(blob),
        });
      }
      setShots((prev) => [...prev, ...next]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "사진을 읽지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }

  function remove(id: string) {
    setShots((prev) => {
      const found = prev.find((shot) => shot.id === id);
      if (found) URL.revokeObjectURL(found.preview);
      return prev.filter((shot) => shot.id !== id);
    });
  }

  return (
    <div>
      <form action={formAction} className="space-y-8">
        <input type="hidden" name="category" value={category} />
        {kind ? <input type="hidden" name="kind" value={kind} /> : null}
        {shots.map((shot) => (
          <input key={shot.id} type="hidden" name="images" value={shot.data} />
        ))}

        <section>
          <p className="label mb-3">사려는 옷은</p>
          <div className="flex flex-wrap gap-2">
            {SLOT_ORDER.map((slot) => (
              <button
                key={slot}
                type="button"
                aria-pressed={category === slot}
                onClick={() => {
                  setCategory(slot);
                  setKind(null);
                }}
                className={`chip ${category === slot ? "chip-active" : ""}`}
              >
                {CATEGORY_META[slot].label}
              </button>
            ))}
          </div>

          {/* 세분류는 안 골라도 된다. 고르면 비슷한 옷을 먼저 견준다 */}
          <div className="mt-3 flex flex-wrap gap-2">
            {kindsOf(category).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={kind === value}
                onClick={() => setKind(kind === value ? null : value)}
                className={`chip ${kind === value ? "chip-active" : ""}`}
              >
                {value}
              </button>
            ))}
          </div>
        </section>

        <section>
          <p className="label mb-1">실측표 사진</p>
          <p className="mb-3 text-xs text-muted">
            상세 페이지의 사이즈 표를 캡처해서 올리세요. 최대 {MAX_IMAGES}장.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {shots.map((shot) => (
              <div key={shot.id}>
                <div className="surface relative aspect-square">
                  {/* 방금 만든 blob 미리보기라 next/image 로 감쌀 게 없다 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot.preview} alt="" className="h-full w-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => remove(shot.id)}
                  className="mt-1.5 text-xs text-muted underline underline-offset-2 hover:text-accent"
                >
                  빼기
                </button>
              </div>
            ))}

            {shots.length < MAX_IMAGES ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
                className="surface flex aspect-square flex-col items-center justify-center gap-1
                  border border-dashed border-line text-muted transition-colors hover:border-ink hover:text-ink"
              >
                {busy ? (
                  <span className="text-xs font-medium">읽는 중…</span>
                ) : (
                  <>
                    <span className="display text-2xl text-line">+</span>
                    <span className="text-xs">사진 올리기</span>
                  </>
                )}
              </button>
            ) : null}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => {
              // FileList 를 그대로 들고 있으면 안 된다. 아래에서 input 을 비우는 순간
              // 같은 목록이라 같이 비워져서 아무것도 안 올라간다.
              const files = [...(event.target.files ?? [])];
              event.target.value = "";
              if (files.length > 0) void addFiles(files);
            }}
          />
          {error ? <p className="mt-2 text-sm text-accent">{error}</p> : null}
        </section>

        <section className="rounded-xl bg-mist px-5 py-4 text-sm">
          {ready === 0 ? (
            <p className="text-muted">
              {CATEGORY_META[category].label} 중 실측을 적어 둔 옷이 없어 견줄 게 없습니다. 사진에서
              읽은 값만 알려드립니다.
            </p>
          ) : (
            <p className="text-muted">
              가지고 있는{" "}
              <span className="font-semibold text-ink">
                {CATEGORY_META[category].label} {ready}개
              </span>
              와 견줍니다. 그중 어느 옷이 기준으로 알맞은지는 AI가 고릅니다 — 사이즈감을 적어 둔 옷을
              먼저 봅니다.
            </p>
          )}
        </section>

        <section>
          <label className="label" htmlFor="note">
            덧붙일 말 (선택)
          </label>
          <input
            id="note"
            name="note"
            maxLength={300}
            placeholder="예: M 살까 L 살까, 오버핏으로 입고 싶어요"
            className="field"
          />
        </section>

        <button
          type="submit"
          disabled={pending || busy || shots.length === 0}
          className="btn-dark w-full py-4 sm:w-auto sm:px-10"
        >
          {pending ? "읽는 중…" : "견줘보기"}
        </button>
      </form>

      {pending ? (
        <p className="mt-8 text-sm text-muted">사진을 읽고 있습니다. 20초쯤 걸립니다.</p>
      ) : null}

      {state && !state.ok ? (
        <p role="alert" className="mt-8 text-sm font-medium text-accent">
          {state.message}
        </p>
      ) : null}

      {state && state.ok ? <Answer answer={state.answer} /> : null}
    </div>
  );
}

function Answer({ answer }: { answer: NonNullable<Extract<SizeState, { ok: true }>>["answer"] }) {
  return (
    <div className="mt-10 border-t border-line pt-8">
      <p className="text-xl font-semibold leading-snug">{answer.verdict}</p>
      {/* 무엇과 견줬는지 밝혀야 답을 믿을지 말지 판단할 수 있다 */}
      {answer.basedOn ? (
        <p className="mt-2 text-sm text-muted">
          <span className="font-medium text-ink">{answer.basedOn}</span> 기준
        </p>
      ) : null}

      {answer.diffs.length > 0 ? (
        <table className="mt-6 w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[22%]" />
            <col className="w-[50%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-line text-left">
              <th className="py-3 pr-2 font-medium text-muted">부위</th>
              <th className="py-3 px-2 text-right font-medium text-muted">차이</th>
              <th className="py-3 pl-2 font-medium text-muted">어떻게 느껴질까</th>
            </tr>
          </thead>
          <tbody>
            {answer.diffs.map((row, i) => (
              <tr key={i} className="border-b border-line/70 align-top">
                <td className="py-3 pr-2">{row.part}</td>
                <td className="py-3 px-2 text-right tabular-nums font-medium">
                  {row.diff || <span className="text-line">―</span>}
                </td>
                <td className="py-3 pl-2 text-muted">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {answer.read.length > 0 ? (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm text-muted underline underline-offset-4">
            사진에서 읽은 값 {answer.sizeLabel ? `(${answer.sizeLabel})` : ""}
          </summary>
          <ul className="mt-3 space-y-1 text-sm text-muted">
            {answer.read.map((row, i) => (
              <li key={i}>
                {row.label} · <span className="tabular-nums text-ink">{row.value}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {answer.cautions.length > 0 ? (
        <ul className="mt-6 space-y-2 rounded-xl bg-mist p-5 text-sm text-muted">
          {answer.cautions.map((line, i) => (
            <li key={i}>· {line}</li>
          ))}
        </ul>
      ) : null}

      <p className="mt-6 text-xs text-muted">
        사진을 읽어 견준 값이라 틀릴 수 있습니다. 실제 실측표를 한 번 더 확인하세요.{" "}
        <Link href="/compare" className="underline underline-offset-4">
          가지고 있는 옷끼리 비교
        </Link>
      </p>
    </div>
  );
}
