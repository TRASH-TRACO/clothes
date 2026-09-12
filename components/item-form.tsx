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

/**
 * 등록은 한 화면에 하나씩 묻는다. 처음 쓰는 사람도 무엇을 채워야 하는지
 * 고민할 게 없고, 폰에서 긴 폼을 훑어 내리지 않아도 된다.
 */
const STEPS = [
  { title: "옷 사진을 올려주세요", hint: "여러 장 올리면 상세에서 넘겨볼 수 있어요" },
  { title: "어떤 옷인가요?", hint: null },
  { title: "무슨 색이에요?", hint: "가장 가까운 색 하나만 고르면 돼요" },
  { title: "이름을 지어주세요", hint: "옷장에서 이 이름으로 찾게 돼요" },
  { title: "거의 다 됐어요", hint: "아래는 안 채워도 괜찮아요" },
] as const;

/** 고른 걸 눈으로 확인할 틈. 곧바로 넘기면 눌렀는지 모른다 */
const ADVANCE_MS = 180;

type Color = { name: string; hex: string };

export function ItemForm({ userId, item, brands, action }: Props) {
  const editing = Boolean(item);

  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);
  // 수정할 때는 단계를 밟지 않는다. 한 곳만 고치러 들어오기 때문.
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<Category | null>(item?.category ?? null);
  const [kind, setKind] = useState<string | null>(item?.subcategory ?? null);
  const [color, setColor] = useState<Color | null>(
    item ? { name: item.color_name, hex: item.color_hex } : null,
  );
  const [name, setName] = useState(item?.name ?? "");
  const [photos, setPhotos] = useState<string[]>(itemPhotos(item ?? { photo_path: null, photo_paths: [] }));
  const [more, setMore] = useState(false);

  const fields = category ? measurementFields(category) : [];
  const kinds = category ? kindsOf(category) : [];

  /** 카테고리를 바꾸면 세분류는 지운다 (상의 세분류가 신발에 남으면 안 된다) */
  function pickCategory(next: Category) {
    if (next !== category) setKind(null);
    setCategory(next);
  }

  function go(next: number) {
    setStep(next);
    // 단계가 바뀌면 질문이 화면 맨 위에 와야 한다
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  /** 이름을 안 지었으면 고른 값으로 만들어 준다 (지우고 다시 쓸 수 있다) */
  function suggestName() {
    if (name.trim() || !category) return;
    const what = kind ?? CATEGORY_META[category].label;
    setName(color ? `${color.name} ${what}` : what);
  }

  function pickColor(next: Color) {
    setColor(next);
    if (editing) return;
    setTimeout(() => {
      if (!name.trim() && category) {
        const what = kind ?? CATEGORY_META[category].label;
        setName(`${next.name} ${what}`);
      }
      go(3);
    }, ADVANCE_MS);
  }

  // 단계마다 다음으로 갈 수 있는 조건. 없는 값으로 저장하면 서버에서 막힌다.
  const canAdvance = [true, Boolean(category), Boolean(color), name.trim().length > 0, true][step];
  const last = step === STEPS.length - 1;

  /** 수정 화면에서는 모든 칸을 한꺼번에 보여준다 */
  const shown = (index: number) => editing || step === index;

  return (
    <form action={formAction} className="mx-auto max-w-xl">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      {category ? <input type="hidden" name="category" value={category} /> : null}
      {kind ? <input type="hidden" name="subcategory" value={kind} /> : null}
      {color ? <input type="hidden" name="color_name" value={color.name} /> : null}
      {color ? <input type="hidden" name="color_hex" value={color.hex} /> : null}

      {!editing && (
        <div className="mb-8">
          <div className="h-1 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-ink transition-[width] duration-300"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
          <div className="mt-6 flex items-start gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => go(step - 1)}
                aria-label="이전 단계"
                className="-ml-2 shrink-0 px-2 py-1 text-2xl leading-none text-muted hover:text-ink"
              >
                ‹
              </button>
            )}
            <div>
              <h2 className="text-2xl font-semibold leading-snug sm:text-3xl">{STEPS[step].title}</h2>
              {STEPS[step].hint && <p className="mt-2 text-sm text-muted">{STEPS[step].hint}</p>}
            </div>
          </div>
        </div>
      )}

      {/* 1 사진 */}
      <div className={shown(0) ? "" : "hidden"}>
        {editing && <h2 className="eyebrow mb-4">사진</h2>}
        <PhotoListInput
          userId={userId}
          defaultPaths={photos}
          onChange={setPhotos}
        />
      </div>

      {/* 2 카테고리 → 세분류 */}
      <div className={shown(1) ? "" : "hidden"}>
        {editing && <h2 className="eyebrow mb-4 mt-10">카테고리</h2>}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {CATEGORIES.map((value) => {
            const active = category === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => pickCategory(value)}
                className={`rounded-2xl border px-4 py-5 text-left transition-colors ${
                  active ? "border-ink bg-ink text-paper" : "border-line bg-paper hover:border-ink"
                }`}
              >
                <span className="display block text-xs opacity-60">{CATEGORY_META[value].en}</span>
                <span className="mt-1 block text-lg font-semibold">{CATEGORY_META[value].label}</span>
              </button>
            );
          })}
        </div>

        {/* 카테고리를 골라야 무엇을 물어야 할지 정해진다 */}
        {category && (
          <div className="mt-8">
            <p className="label mb-3">어떤 {CATEGORY_META[category].label}인가요? (선택)</p>
            <div className="flex flex-wrap gap-2">
              {kinds.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={kind === value}
                  onClick={() => {
                    const next = kind === value ? null : value;
                    setKind(next);
                    if (!editing && next) setTimeout(() => go(2), ADVANCE_MS);
                  }}
                  className={`chip ${kind === value ? "chip-active" : ""}`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3 색 */}
      <div className={shown(2) ? "" : "hidden"}>
        {editing && <h2 className="eyebrow mb-4 mt-10">색상</h2>}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {COLOR_PRESETS.map((preset) => {
            const active = color?.name === preset.name;
            return (
              <button
                key={preset.name}
                type="button"
                aria-pressed={active}
                onClick={() => pickColor({ name: preset.name, hex: preset.hex })}
                className="flex flex-col items-center gap-2"
              >
                <span
                  className={`h-14 w-14 rounded-full transition-[box-shadow] ${
                    active ? "ring-2 ring-ink ring-offset-2" : ""
                  }`}
                  style={{
                    background: preset.hex,
                    boxShadow: isLight(preset.hex) ? "inset 0 0 0 1px #d4d4d4" : undefined,
                  }}
                />
                <span className={`text-xs ${active ? "font-semibold" : "text-muted"}`}>
                  {preset.name}
                </span>
              </button>
            );
          })}
        </div>

        <details className="mt-8">
          <summary className="cursor-pointer text-sm text-muted underline underline-offset-4">
            직접 고르기
          </summary>
          <div className="mt-4 flex items-center gap-3">
            <input
              type="color"
              aria-label="직접 색상 고르기"
              value={color?.hex ?? "#111111"}
              onChange={(event) =>
                setColor({ name: color?.name ?? "직접 고른 색", hex: event.target.value })
              }
              className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-paper p-1"
            />
            <input
              aria-label="색상 이름"
              value={color?.name ?? ""}
              placeholder="색 이름"
              onChange={(event) =>
                setColor({ name: event.target.value, hex: color?.hex ?? "#111111" })
              }
              maxLength={20}
              className="field max-w-[200px]"
            />
          </div>
        </details>
      </div>

      {/* 4 이름·브랜드·사이즈 */}
      <div className={shown(3) ? "" : "hidden"}>
        {editing && <h2 className="eyebrow mb-4 mt-10">이름</h2>}
        <input
          id="name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={80}
          placeholder="예: 오버핏 반팔 티셔츠"
          className="field text-lg"
        />

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="brand">
              브랜드 (선택)
            </label>
            <BrandInput brands={brands} defaultValue={item?.brand ?? ""} />
          </div>
          <div>
            <label className="label" htmlFor="size_label">
              사이즈 표기 (선택)
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
        </div>
      </div>

      {/* 5 실측·메모 */}
      <div className={shown(4) ? "" : "hidden"}>
        {!editing && category && color && (
          <div className="mb-8 flex items-center gap-4 rounded-2xl bg-mist p-4">
            <span
              className="h-10 w-10 shrink-0 rounded-full"
              style={{
                background: color.hex,
                boxShadow: isLight(color.hex) ? "inset 0 0 0 1px #d4d4d4" : undefined,
              }}
            />
            <div className="min-w-0">
              <p className="truncate font-semibold">{name || "이름 없음"}</p>
              <p className="text-sm text-muted">
                {CATEGORY_META[category].label}
                {kind ? ` · ${kind}` : ""} · {color.name}
                {photos.length > 0 ? ` · 사진 ${photos.length}장` : ""}
              </p>
            </div>
          </div>
        )}

        {/* 실측은 대부분 안 적는다. 기본은 접어 두고 필요한 사람만 편다 */}
        {editing || more ? (
          <div className="space-y-8">
            <section>
              <h2 className="eyebrow mb-1 mt-10">
                실측{category ? ` (${CATEGORY_META[category].label})` : ""}
              </h2>
              <p className="mb-4 text-sm text-muted">비워두면 저장하지 않습니다.</p>
              <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMore(true)}
            className="w-full rounded-2xl border border-dashed border-line px-4 py-4 text-sm text-muted hover:border-ink hover:text-ink"
          >
            실측·메모도 적기
          </button>
        )}
      </div>

      {state && !state.ok ? (
        <p role="alert" className="mt-6 text-sm font-medium text-accent">
          {state.message}
        </p>
      ) : null}

      {/* 버튼은 늘 엄지 닿는 곳에. 화면보다 폼이 길면 바닥에 붙는다 */}
      <div className="sticky bottom-0 z-10 mt-10 flex items-center gap-3 bg-paper pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4">
        {editing || last ? (
          <>
            <button type="submit" disabled={pending} className="btn-dark flex-1 py-4">
              {pending ? "저장 중…" : editing ? "수정 저장" : "옷장에 추가"}
            </button>
            <Link href={item ? `/closet/${item.id}` : "/closet"} className="btn-ghost">
              취소
            </Link>
          </>
        ) : (
          <button
            type="button"
            disabled={!canAdvance}
            onClick={() => {
              if (step === 2) suggestName();
              go(step + 1);
            }}
            className="btn-dark w-full py-4"
          >
            {step === 0 && photos.length === 0 ? "사진 없이 계속" : "다음"}
          </button>
        )}
      </div>
    </form>
  );
}
