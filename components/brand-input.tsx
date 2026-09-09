"use client";

import { useId, useMemo, useRef, useState } from "react";

export type BrandOption = { name: string; count: number };

type Props = {
  brands: BrandOption[];
  defaultValue?: string;
};

/** 편집 거리. 오타 후보를 찾는 용도라 2를 넘으면 세지 않고 끊는다 */
function editDistance(a: string, b: string, limit = 2): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let best = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
      best = Math.min(best, current[j]);
    }
    if (best > limit) return limit + 1;
    previous = current;
  }
  return previous[b.length];
}

/**
 * 브랜드 입력. 새로 쓸 수도 있고 이미 쓴 브랜드를 고를 수도 있다.
 * "칼하트"를 "칼할트"로 잘못 써서 브랜드가 둘로 갈리는 걸 막는 게 목적이라,
 * 목록에 없는 값을 넣으면 비슷한 기존 브랜드를 제안한다.
 */
export function BrandInput({ brands, defaultValue = "" }: Props) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const keyword = value.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!keyword) return brands.slice(0, 8);
    return brands
      .filter((brand) => brand.name.toLowerCase().includes(keyword))
      .slice(0, 8);
  }, [brands, keyword]);

  const exact = brands.some((brand) => brand.name.toLowerCase() === keyword);

  /** 목록에 없는 값일 때, 오타로 보이는 기존 브랜드 */
  const didYouMean = useMemo(() => {
    if (!keyword || exact) return null;
    if (keyword.length < 2) return null;
    return (
      brands.find(
        (brand) => editDistance(keyword, brand.name.toLowerCase()) <= 2,
      )?.name ?? null
    );
  }, [brands, keyword, exact]);

  function choose(name: string) {
    setValue(name);
    setOpen(false);
    setActive(-1);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (!open || matches.length === 0) {
      if (event.key === "ArrowDown") setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % matches.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index <= 0 ? matches.length - 1 : index - 1));
    } else if (event.key === "Enter" && active >= 0) {
      // 목록에서 고르는 중이면 폼이 제출되지 않게 막는다
      event.preventDefault();
      choose(matches[active].name);
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id="brand"
        name="brand"
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        // 항목 클릭이 blur보다 늦게 오므로 조금 미뤄서 닫는다
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={handleKeyDown}
        maxLength={60}
        placeholder="선택 입력"
        className="field"
        autoComplete="off"
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
      />

      {open && matches.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-line bg-paper py-1 shadow-lg"
        >
          {matches.map((brand, index) => (
            <li key={brand.name}>
              <button
                type="button"
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(brand.name)}
                onMouseEnter={() => setActive(index)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm ${
                  index === active ? "bg-mist" : ""
                }`}
              >
                <span className="truncate">{brand.name}</span>
                <span className="shrink-0 text-xs text-muted">
                  {brand.count}개
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {didYouMean ? (
        <p className="mt-2 text-xs text-muted">
          혹시{" "}
          <button
            type="button"
            onClick={() => choose(didYouMean)}
            className="font-semibold text-ink underline underline-offset-4"
          >
            {didYouMean}
          </button>
          인가요? 새 브랜드로 등록하려면 그대로 두세요.
        </p>
      ) : null}
    </div>
  );
}
