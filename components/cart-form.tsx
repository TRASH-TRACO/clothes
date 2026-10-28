"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { saveCartItem } from "@/app/actions/cart";
import { PhotoInput } from "@/components/photo-input";
import { CATEGORIES, CATEGORY_META, measurementFields, type Category } from "@/lib/categories";
import { safeUrl } from "@/lib/safe-url";
import type { ActionState, CartItem } from "@/lib/types";

type Props = { userId: string; item?: CartItem };

/**
 * 장바구니에 담기 / 고치기.
 *
 * **이름만 있으면 저장된다.** 보다가 급히 담아 두는 자리라, 여기서 다 적으라고
 * 하면 아예 안 담게 된다. 링크도 값도 실측도 나중에 채우면 된다.
 */
export function CartForm({ userId, item }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveCartItem, null);
  const [category, setCategory] = useState<Category | "">(item?.category ?? "");
  const [url, setUrl] = useState(item?.url ?? "");

  // 적어 둔 주소를 걸 수 있는지 그 자리에서 알려준다. 저장한 뒤에 알면 늦다
  const linkable = url.trim() ? safeUrl(url) !== null : null;
  const fields = category ? measurementFields(category) : [];

  return (
    <form action={formAction} className="space-y-10">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}

      <section className="grid gap-8 sm:grid-cols-[200px_minmax(0,1fr)]">
        <div>
          <p className="label mb-2">사진 (선택)</p>
          <PhotoInput
            userId={userId}
            defaultPath={item?.photo_path ?? null}
            emptyLabel="상품 사진 올리기"
            alt="사려는 옷 사진"
          />
        </div>

        <div className="space-y-6">
          <div>
            <label className="label" htmlFor="name">
              이름
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={80}
              defaultValue={item?.name ?? ""}
              placeholder="예: 샴브레이 워크셔츠"
              className="field"
            />
          </div>

          <div>
            <label className="label" htmlFor="url">
              링크 <span className="font-normal normal-case tracking-normal text-muted">(선택)</span>
            </label>
            <input
              id="url"
              name="url"
              type="url"
              inputMode="url"
              maxLength={2000}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="상품 페이지 주소를 붙여넣으세요"
              className="field"
            />
            <p className="mt-2 text-sm text-muted">
              {linkable === false
                ? "이 주소는 링크로 못 겁니다. http:// 또는 https:// 로 시작하는 주소를 넣어주세요."
                : "체계를 안 적어도 됩니다 — musinsa.com/… 처럼 넣으면 https 로 봅니다."}
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="brand">
                브랜드 <span className="font-normal normal-case tracking-normal text-muted">(선택)</span>
              </label>
              <input
                id="brand"
                name="brand"
                maxLength={60}
                defaultValue={item?.brand ?? ""}
                className="field"
              />
            </div>
            <div>
              <label className="label" htmlFor="price">
                값 <span className="font-normal normal-case tracking-normal text-muted">(선택)</span>
              </label>
              <input
                id="price"
                name="price"
                inputMode="numeric"
                defaultValue={item?.price ?? ""}
                placeholder="129000"
                className="field"
              />
            </div>
          </div>
        </div>
      </section>

      <section>
        <p className="label mb-3">
          분류 <span className="font-normal normal-case tracking-normal text-muted">(선택)</span>
        </p>
        <input type="hidden" name="category" value={category} />
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategory("")}
            className={`chip ${category === "" ? "chip-active" : ""}`}
          >
            안 정함
          </button>
          {CATEGORIES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setCategory(value)}
              className={`chip ${category === value ? "chip-active" : ""}`}
            >
              {CATEGORY_META[value].label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-muted">
          정해 두면 아래에 그 분류의 실측 칸이 뜹니다. 가진 옷과 견줄 때 쓰입니다.
        </p>
      </section>

      {/* 분류를 정했을 때만. 안 정한 채 칸만 늘어놓으면 뭘 적으란 건지 모른다 */}
      {fields.length > 0 ? (
        <section>
          <p className="label mb-1">상품 페이지 실측</p>
          <p className="mb-4 text-sm text-muted">
            상세 페이지에 적힌 숫자를 옮겨두면, 가진 옷과 몇 cm 차이인지 바로 견줄 수 있습니다.
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            {fields.map((field) => (
              <div key={field.key}>
                <label className="label" htmlFor={`m_${field.key}`}>
                  {field.label}
                </label>
                <input
                  id={`m_${field.key}`}
                  name={`m_${field.key}`}
                  inputMode="decimal"
                  defaultValue={item?.measurements[field.key] ?? ""}
                  placeholder={field.placeholder}
                  className="field"
                />
                {field.hint ? <p className="mt-1 text-xs text-muted">{field.hint}</p> : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <label className="label" htmlFor="memo">
          메모 <span className="font-normal normal-case tracking-normal text-muted">(선택)</span>
        </label>
        <textarea
          id="memo"
          name="memo"
          rows={3}
          maxLength={300}
          defaultValue={item?.memo ?? ""}
          placeholder="세일 기다리는 중, 사이즈 L로 / 가진 셔츠보다 품이 큼 …"
          className="field max-w-xl resize-none"
        />
      </section>

      {state && !state.ok ? <p className="text-sm text-accent">{state.message}</p> : null}

      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="btn-dark min-w-[160px]">
          {pending ? "저장 중…" : item ? "수정 저장" : "장바구니에 담기"}
        </button>
        <Link href="/cart" className="text-sm text-muted underline underline-offset-4 hover:text-ink">
          취소
        </Link>
      </div>
    </form>
  );
}
