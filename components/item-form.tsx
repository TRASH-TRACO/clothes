"use client";

import Link from "next/link";
import { Fragment, useActionState, useEffect, useRef, useState } from "react";

import { BrandInput, type BrandOption } from "@/components/brand-input";
import { FitPicker } from "@/components/fit-picker";
import { PartFitPicker } from "@/components/part-fit-picker";
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
import { readPartFits } from "@/lib/feedback";
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
  /** 사진을 자르거나 올리는 중. 그 사이에 저장되면 손에 든 사진을 잃는다 */
  const [photoBusy, setPhotoBusy] = useState(false);

  /**
   * 우리가 지어 준 이름은 **고른 채로** 보여준다.
   *
   * 지어 주는 이름("블루 상의")은 거의 다 고쳐 쓴다. 그대로 두면 커서를 맨 뒤로
   * 보내 놓고 지우기부터 시작해야 한다. 골라 두면 바로 쳐서 덮어쓸 수 있고,
   * 그대로 쓰고 싶으면 다음으로 넘어가면 된다.
   *
   * 숫자를 올려서 신호를 보낸다 — 같은 이름을 두 번 지어 줘도 다시 골라진다.
   */
  const nameRef = useRef<HTMLInputElement>(null);
  const [autoNamed, setAutoNamed] = useState(0);
  useEffect(() => {
    if (autoNamed === 0) return;
    const field = nameRef.current;
    if (!field) return;
    field.focus();
    field.select();
  }, [autoNamed]);

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

  /** 이름을 안 지었으면 고른 값으로 만들어 준다 (골라 둔 채로 보여주므로 바로 덮어쓸 수 있다) */
  function suggestName() {
    if (name.trim() || !category) return;
    const what = kind ?? CATEGORY_META[category].label;
    setName(color ? `${color.name} ${what}` : what);
    setAutoNamed((count) => count + 1);
  }

  function pickColor(next: Color) {
    setColor(next);
    if (editing) return;
    setTimeout(() => {
      if (!name.trim() && category) {
        const what = kind ?? CATEGORY_META[category].label;
        setName(`${next.name} ${what}`);
        setAutoNamed((count) => count + 1);
      }
      go(3);
    }, ADVANCE_MS);
  }

  // 단계마다 다음으로 갈 수 있는 조건. 없는 값으로 저장하면 서버에서 막힌다.
  const canAdvance = [true, Boolean(category), Boolean(color), name.trim().length > 0, true][step];
  const last = step === STEPS.length - 1;

  /** 수정 화면에서는 모든 칸을 한꺼번에 보여준다 */
  const shown = (index: number) => editing || step === index;

  /**
   * 이름 칸. **한 군데서만 만든다.**
   *
   * 고치는 화면에서는 이게 제목 자리에 온다. 예전에는 페이지 맨 위에 옷 이름을
   * 크게 쓰고, 그 아래 폼에 "이름" 칸을 또 뒀다. 같은 걸 두 번 보여주면서
   * 고치는 건 아래쪽뿐이라, 위를 눌러 보다가 아래로 내려가야 했다.
   * 이제 제목이 곧 입력 칸이다.
   */
  const nameField = (
    <input
      ref={nameRef}
      id="name"
      name="name"
      value={name}
      onChange={(event) => setName(event.target.value)}
      maxLength={80}
      placeholder={editing ? "이름" : "예: 오버핏 반팔 티셔츠"}
      /* 크기는 감싼 쪽이 정한다 — globals.css 의 `input { font-size: max(16px, 1em) }`
         가 레이어 밖이라 text-3xl 같은 유틸리티보다 세다. 1em 은 부모 글자 크기라
         부모에 크기를 주면 칸이 그대로 따라온다 */
      className={
        editing
          ? `w-full border-b border-line bg-transparent pb-2 font-semibold
             outline-none transition-colors placeholder:text-line focus:border-ink`
          : "field"
      }
    />
  );

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

      {/* 고치는 화면의 제목 = 이름 칸 (page.tsx 에는 제목이 없다) */}
      {editing && <div className="mb-10 text-3xl sm:text-4xl">{nameField}</div>}

      {/* 1 사진 */}
      <div className={shown(0) ? "" : "hidden"}>
        {editing && <h2 className="eyebrow mb-4">사진</h2>}
        <PhotoListInput
          userId={userId}
          defaultPaths={photos}
          onChange={setPhotos}
          onBusy={setPhotoBusy}
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

      {/* 4 이름·브랜드·사이즈 (고칠 때 이름은 맨 위 제목에 있다) */}
      <div className={shown(3) ? "" : "hidden"}>
        {editing ? null : <div className="text-lg">{nameField}</div>}

        <div className={`grid gap-5 sm:grid-cols-2 ${editing ? "mt-10" : "mt-8"}`}>
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

        {/* 표기 사이즈(M, 100)와 실제로 입어본 느낌은 다르다. 그래서 따로 받는다 */}
        <div className="mt-8">
          <p className="label mb-1">입어보니 품이 (선택)</p>
          <p className="mb-3 text-xs text-muted">왼쪽으로 갈수록 작고 오른쪽으로 갈수록 넉넉합니다.</p>
          <FitPicker defaultValue={item?.fit ?? null} />

          {/* "크다" 만으로는 어깨가 큰 건지 기장이 긴 건지 모른다.
              새 옷 살 때 필요한 건 그 "어디가" 쪽이다. */}
          {fields.length > 0 ? (
            <div className="mt-6 rounded-xl bg-mist p-4">
              <p className="mb-1 text-sm font-medium">어디가 그런가요? (선택)</p>
              <p className="mb-4 text-xs text-muted">딱 맞은 부위는 안 고르면 됩니다.</p>
              <PartFitPicker fields={fields} /* DB 의 jsonb 를 그대로 믿지 않는다 */
                defaultValues={readPartFits(item?.fit_notes)} />
            </div>
          ) : null}
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
                    {/* 라벨에 괄호가 있는 칸이 있어 단위는 괄호 없이 붙인다 (소매 (어깨선) (CM) 방지) */}
                    <label className="label mb-1" htmlFor={`m_${field.key}`}>
                      {field.label} <span className="text-muted">{field.unit}</span>
                    </label>
                    {/* 소매처럼 재는 곳이 헷갈리는 칸만 한 줄 붙는다 */}
                    {field.hint && <p className="mb-2 text-xs text-muted">{field.hint}</p>}
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
        {/* key 를 나눠서 두 버튼이 **다른 DOM 노드**가 되게 한다.
            없으면 React 가 같은 <button> 을 재사용해 type 만 submit 으로 바꾸는데,
            브라우저는 클릭의 기본 동작을 핸들러가 끝난 뒤에 적용한다.
            그래서 "다음" 을 한 번 눌렀을 뿐인데 마지막 단계로 넘어가면서 그대로
            저장까지 됐다 (마지막 화면이 스쳐 지나간 것처럼 보였다). */}
        {editing || last ? (
          <Fragment key="save">
            {/* 자르는 중에는 잠근다. 손에 든 사진을 두고 저장되면 안 된다 */}
            <button type="submit" disabled={pending || photoBusy} className="btn-dark flex-1 py-4">
              {pending ? "저장 중…" : photoBusy ? "사진 먼저 끝내기" : editing ? "수정 저장" : "옷장에 추가"}
            </button>
            <Link href={item ? `/closet/${item.id}` : "/closet"} className="btn-ghost">
              취소
            </Link>
          </Fragment>
        ) : (
          <button
            key="next"
            type="button"
            disabled={!canAdvance || photoBusy}
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
