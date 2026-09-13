"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { matchesQuery } from "@/lib/search";

export type PickerOption = {
  value: string;
  label: string;
  /** 이름 아래 작게 붙는 줄 (브랜드·분류 등) */
  hint?: string;
  /** 이름에는 없지만 검색에는 걸려야 하는 말 */
  keywords?: string;
  /** 묶음 이름. 같은 값끼리 붙어 있으면 머리글이 한 번 붙는다 */
  group?: string;
};

type Props = {
  id: string;
  /** 무엇을 고르는지. 열었을 때 맨 위에 뜬다 */
  title: string;
  value: string;
  options: PickerOption[];
  onChange: (value: string) => void;
  /** 아직 안 골랐을 때 단추에 뜨는 말 */
  placeholder: string;
  disabled?: boolean;
  className?: string;
};

/** 이보다 길면 열자마자 검색칸에 손이 가 있게 한다 */
const AUTOFOCUS_FROM = 8;

/**
 * 검색되는 고르기 칸.
 *
 * 기본 `<select>` 를 안 쓰는 이유는 컨펌창 때와 같다. 폰마다 생김새가 다르고,
 * 설치해서 앱처럼 쓰는 화면에서 갑자기 남의 상자가 올라온다. 무엇보다 **옷이
 * 늘면 휠을 한참 돌려야 한다** — 이름을 아는데도 찾아 내려가야 하는 게 이상하다.
 *
 * 좁은 칸에 목록을 매다는 대신 아래에서 올라오는 판으로 연다. 비교 화면은 칸이
 * 반쪽(폰에서 170px 남짓)이라, 거기 매달면 이름이 다 잘린다.
 *
 * 검색은 이름·브랜드·분류를 같이 보고 **첫소리로도 걸린다** (`lib/search.ts`).
 */
export function Picker({
  id,
  title,
  value,
  options,
  onChange,
  placeholder,
  disabled = false,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  /**
   * 화살표로 짚고 있는 줄. -1 은 아직 아무 줄도 안 짚은 상태다.
   *
   * 열자마자 첫 줄을 강조하면 그게 **이미 고른 것**처럼 보인다. 손가락으로 쓰는
   * 화면에서는 화살표를 누를 일도 없으니 그냥 오해만 남는다.
   * 뭔가 쳤을 때만 맨 위를 짚는다 — 그때는 Enter 로 바로 고르는 흐름이라 강조가 맞다.
   */
  const [active, setActive] = useState(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((option) => option.value === value) ?? null;

  const shown = useMemo(
    () => options.filter((option) => matchesQuery(query, option.label, option.hint, option.keywords)),
    [options, query],
  );

  useEffect(() => {
    if (!open) return;

    if (options.length >= AUTOFOCUS_FROM) searchRef.current?.focus();

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    // 뒤에서 본문이 같이 스크롤되면 고르는 중에 자리를 잃는다
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, options.length]);

  function close() {
    setOpen(false);
    setQuery("");
    setActive(-1);
  }

  function pick(next: string) {
    onChange(next);
    close();
  }

  /** ↑↓ 로 옮기고 Enter 로 고른다. 검색칸에 손이 있는 채로 다 되게 */
  function onSearchKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (shown.length === 0) return;
      const down = event.key === "ArrowDown";
      // 아무 줄도 안 짚었으면 ↓ 는 처음으로, ↑ 는 끝으로
      const next =
        active < 0 ? (down ? 0 : shown.length - 1) : (active + (down ? 1 : -1) + shown.length) % shown.length;
      setActive(next);
      listRef.current
        ?.querySelector(`[data-index="${next}"]`)
        ?.scrollIntoView({ block: "nearest" });
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      // 짚어 둔 게 없으면 맨 위를 고른다 (쳐서 좁힌 뒤 바로 Enter 치는 흐름)
      const option = shown[active < 0 ? 0 : active];
      if (option) pick(option.value);
    }
  }

  return (
    <>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`field flex items-center justify-between gap-2 text-left
          disabled:text-muted ${className}`}
      >
        <span className={`truncate ${selected ? "" : "text-muted"}`}>
          {selected?.label ?? placeholder}
        </span>
        <Chevron />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
        >
          <button
            type="button"
            aria-label="닫기"
            onClick={close}
            className="absolute inset-0 bg-ink/40"
          />

          <div
            className="relative flex max-h-[80vh] w-full max-w-md flex-col rounded-t-2xl bg-paper
              pb-[env(safe-area-inset-bottom)] sm:max-h-[70vh] sm:rounded-2xl sm:pb-0"
          >
            <div className="border-b border-line px-5 pt-5 pb-4">
              <p className="text-lg font-semibold">{title}</p>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActive(event.target.value ? 0 : -1);
                }}
                onKeyDown={onSearchKey}
                placeholder="이름·브랜드로 찾기 (ㅇㅂㅍ 도 됩니다)"
                aria-label="찾기"
                className="field mt-4"
              />
            </div>

            <div ref={listRef} role="listbox" aria-label={title} className="overflow-y-auto p-2">
              {shown.length === 0 ? (
                <p className="px-3 py-10 text-center text-sm text-muted">찾는 옷이 없습니다.</p>
              ) : (
                shown.map((option, index) => {
                  // 같은 묶음이 이어지면 머리글은 한 번만
                  const head = option.group && option.group !== shown[index - 1]?.group;
                  return (
                    <div key={option.value}>
                      {head ? (
                        <p className="eyebrow px-3 pt-4 pb-1">{option.group}</p>
                      ) : null}
                      <button
                        type="button"
                        data-index={index}
                        role="option"
                        aria-selected={option.value === value}
                        onClick={() => pick(option.value)}
                        onMouseEnter={() => setActive(index)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left
                          ${index === active ? "bg-mist" : ""}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{option.label}</span>
                          {option.hint ? (
                            <span className="mt-0.5 block truncate text-xs text-muted">
                              {option.hint}
                            </span>
                          ) : null}
                        </span>
                        {option.value === value ? <Check /> : null}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-line p-3">
              <button type="button" onClick={close} className="btn-light w-full py-3">
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="size-4 shrink-0 text-muted">
      <path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className="size-4 shrink-0">
      <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
