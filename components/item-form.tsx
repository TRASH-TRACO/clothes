"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { BrandInput, type BrandOption } from "@/components/brand-input";
import { PhotoListInput } from "@/components/photo-list-input";
import {
  CATEGORIES,
  CATEGORY_META,
  kindsOf,
  measurementFields,
  type Category,
} from "@/lib/categories";
import { COLOR_PRESETS, isLight } from "@/lib/colors";
import { itemPhotos } from "@/lib/photos";
import type { ActionState, Item } from "@/lib/types";

type Props = {
  userId: string;
  item?: Item;
  /** 이미 등록된 브랜드. 오타로 중복이 생기지 않게 골라 쓴다 */
  brands: BrandOption[];
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
};

export function ItemForm({ userId, item, brands, action }: Props) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);
  const [category, setCategory] = useState<Category>(item?.category ?? "top");
  const [kind, setKind] = useState<string | null>(item?.subcategory ?? null);
  const [color, setColor] = useState({
    name: item?.color_name ?? COLOR_PRESETS[0].name,
    hex: item?.color_hex ?? COLOR_PRESETS[0].hex,
  });

  const fields = measurementFields(category);
  const kinds = kindsOf(category);

  /** 카테고리를 바꾸면 세분류는 지운다 (상의 세분류가 신발에 남으면 안 된다) */
  function pickCategory(next: Category) {
    setCategory(next);
    if (next !== category) setKind(null);
  }

  return (
    <form action={formAction} className="grid gap-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <input type="hidden" name="category" value={category} />
      {kind ? <input type="hidden" name="subcategory" value={kind} /> : null}
      <input type="hidden" name="color_name" value={color.name} />
      <input type="hidden" name="color_hex" value={color.hex} />

      <div className="lg:sticky lg:top-32 lg:self-start">
        <PhotoListInput userId={userId} defaultPaths={itemPhotos(item ?? { photo_path: null, photo_paths: [] })} />
      </div>

      <div className="space-y-10">
        <section>
          <h2 className="eyebrow mb-4">카테고리</h2>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => pickCategory(value)}
                className={`chip ${category === value ? "chip-active" : ""}`}
              >
                {CATEGORY_META[value].label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="eyebrow mb-4">세분류 (선택)</h2>
          <div className="flex flex-wrap gap-2">
            {kinds.map((value) => (
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

        <section className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">
              이름
            </label>
            <input
              id="name"
              name="name"
              defaultValue={item?.name}
              required
              maxLength={80}
              placeholder="예: 오버핏 반팔 티셔츠"
              className="field"
            />
          </div>
          <div>
            <label className="label" htmlFor="brand">
              브랜드
            </label>
            <BrandInput brands={brands} defaultValue={item?.brand ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="size_label">
              사이즈 표기
            </label>
            <input
              id="size_label"
              name="size_label"
              defaultValue={item?.size_label ?? ""}
              maxLength={20}
              placeholder="M / 100 / 32"
              className="field"
            />
          </div>
        </section>

        <section>
          <h2 className="eyebrow mb-4">색상</h2>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((preset) => {
              const active = color.name === preset.name;
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => setColor({ name: preset.name, hex: preset.hex })}
                  aria-pressed={active}
                  className={`chip ${active ? "chip-active" : ""}`}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full"
                    style={{
                      background: preset.hex,
                      boxShadow: isLight(preset.hex) ? "inset 0 0 0 1px #d4d4d4" : undefined,
                    }}
                  />
                  {preset.name}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <input
              type="color"
              aria-label="직접 색상 고르기"
              value={color.hex}
              onChange={(event) => setColor((prev) => ({ ...prev, hex: event.target.value }))}
              className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-paper p-1"
            />
            <input
              aria-label="색상 이름"
              value={color.name}
              onChange={(event) => setColor((prev) => ({ ...prev, name: event.target.value }))}
              maxLength={20}
              className="field max-w-[200px]"
            />
          </div>
        </section>

        <section>
          <h2 className="eyebrow mb-1">실측 ({CATEGORY_META[category].label})</h2>
          <p className="mb-4 text-sm text-muted">비워두면 저장하지 않습니다.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((field) => (
              <div key={field.key}>
                <label className="label" htmlFor={`m_${field.key}`}>
                  {field.label} ({field.unit})
                </label>
                <input
                  id={`m_${field.key}`}
                  name={`m_${field.key}`}
                  type="number"
                  step="0.1"
                  min="0"
                  inputMode="decimal"
                  placeholder={field.placeholder}
                  defaultValue={item?.measurements?.[field.key] ?? ""}
                  className="field"
                />
              </div>
            ))}
          </div>
        </section>

        <section>
          <label className="label" htmlFor="notes">
            메모
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            maxLength={500}
            defaultValue={item?.notes ?? ""}
            placeholder="세탁 주의, 핏 느낌, 구매처 등"
            className="field resize-none"
          />
        </section>

        {state && !state.ok ? (
          <p role="alert" className="text-sm font-medium text-accent">
            {state.message}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
          <button type="submit" disabled={pending} className="btn-dark min-w-[160px]">
            {pending ? "저장 중…" : item ? "수정 저장" : "옷장에 추가"}
          </button>
          <Link href={item ? `/closet/${item.id}` : "/closet"} className="btn-ghost">
            취소
          </Link>
        </div>
      </div>
    </form>
  );
}
