"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ItemPhoto } from "@/components/item-photo";
import { compareRows, diffLabel } from "@/lib/compare";
import { CATEGORY_META, SLOT_ORDER, measurementFields } from "@/lib/categories";
import { FIT_LABELS } from "@/lib/feedback";
import type { Item } from "@/lib/types";

/**
 * 옷 두 벌을 골라 실측을 나란히 본다.
 *
 * 고른 옷은 주소에 남긴다 (?a=&b=). 뒤로 가기가 통하고, 링크를 그대로 열면
 * 같은 비교가 뜬다 — "이거랑 이거 중에 뭐 살까" 를 남한테 보여주기도 한다.
 */
export function CompareView({ items, initialA, initialB }: {
  items: Item[];
  initialA: string | null;
  initialB: string | null;
}) {
  const [a, setA] = useState(initialA ?? "");
  const [b, setB] = useState(initialB ?? "");

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const itemA = byId.get(a) ?? null;
  const itemB = byId.get(b) ?? null;

  // 분류별로 묶어 두면 목록이 길어도 찾기 쉽다
  const groups = useMemo(
    () =>
      SLOT_ORDER.map((slot) => ({
        slot,
        items: items.filter((item) => item.category === slot),
      })).filter((group) => group.items.length > 0),
    [items],
  );

  const rows =
    itemA && itemB
      ? compareRows(
          measurementFields(itemA.category),
          measurementFields(itemB.category),
          itemA.measurements,
          itemB.measurements,
        )
      : [];

  /** 주소만 바꾼다. 서버를 다시 부를 이유가 없다 (옷 목록은 이미 들고 있다) */
  function sync(nextA: string, nextB: string) {
    const params = new URLSearchParams();
    if (nextA) params.set("a", nextA);
    if (nextB) params.set("b", nextB);
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }

  function pick(side: "a" | "b", value: string) {
    if (side === "a") {
      setA(value);
      sync(value, b);
    } else {
      setB(value);
      sync(a, value);
    }
  }

  function swap() {
    setA(b);
    setB(a);
    sync(b, a);
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        {(["a", "b"] as const).map((side) => {
          const value = side === "a" ? a : b;
          const item = side === "a" ? itemA : itemB;
          return (
            <div key={side}>
              <label className="label" htmlFor={`pick-${side}`}>
                {side === "a" ? "기준" : "비교할 옷"}
              </label>
              <select
                id={`pick-${side}`}
                value={value}
                onChange={(event) => pick(side, event.target.value)}
                className="field"
              >
                <option value="">고르기</option>
                {groups.map((group) => (
                  <optgroup key={group.slot} label={CATEGORY_META[group.slot].label}>
                    {group.items.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                        {option.brand ? ` · ${option.brand}` : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <div className="mt-4">
                {item ? (
                  <Link href={`/closet/${item.id}`} className="group block">
                    <ItemPhoto
                      path={item.photo_path}
                      alt={item.name}
                      category={item.category}
                      className="aspect-square rounded-xl"
                      sizes="(max-width: 640px) 45vw, 260px"
                    />
                    <p className="mt-3 truncate text-sm font-semibold group-hover:underline">
                      {item.name}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {CATEGORY_META[item.category].label}
                      {item.subcategory ? ` · ${item.subcategory}` : ""}
                      {item.size_label ? ` · ${item.size_label}` : ""}
                    </p>
                    {/* 숫자(실측) 옆에 몸으로 느낀 것도 같이 봐야 판단이 된다 */}
                    {item.fit ? (
                      <p className="mt-1 inline-block rounded-full bg-mist px-2.5 py-1 text-xs">
                        입어보니 {FIT_LABELS[item.fit]}
                      </p>
                    ) : null}
                  </Link>
                ) : (
                  <div className="aspect-square rounded-xl border-2 border-dashed border-line" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {itemA && itemB ? (
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="eyebrow">실측 비교</h2>
            <button
              type="button"
              onClick={swap}
              className="text-sm underline underline-offset-4 hover:text-muted"
            >
              좌우 바꾸기
            </button>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-xl bg-mist px-6 py-10 text-center text-sm text-muted">
              두 벌 다 실측이 비어 있습니다. 옷 수정에서 적어두면 여기서 견줄 수 있습니다.
            </p>
          ) : (
            <div>
              {/* 폰에서도 '차이' 칸이 잘리면 안 된다. 그게 보려던 값이다.
                  이름은 위 카드에 이미 있으므로 표에서는 줄여서 보여준다. */}
              <table className="w-full table-fixed border-collapse text-sm">
                <colgroup>
                  <col className="w-[30%]" />
                  <col className="w-[24%]" />
                  <col className="w-[24%]" />
                  <col className="w-[22%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="py-3 pr-2 font-medium text-muted">항목</th>
                    <th className="truncate py-3 px-2 text-right font-medium" title={itemA.name}>
                      {itemA.name}
                    </th>
                    <th className="truncate py-3 px-2 text-right font-medium" title={itemB.name}>
                      {itemB.name}
                    </th>
                    <th className="py-3 pl-2 text-right font-medium text-muted">차이</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const label = diffLabel(row.diff);
                    return (
                      <tr key={row.key} className="border-b border-line/70">
                        <td className="py-3 pr-2 text-muted">{row.label}</td>
                        {/* 큰 쪽을 진하게. 숫자만 보고도 어느 게 큰지 바로 보이게 */}
                        <td
                          className={`py-3 px-2 text-right tabular-nums ${
                            row.diff !== null && row.diff < 0 ? "font-semibold" : ""
                          }`}
                        >
                          {row.a === null ? <span className="text-line">―</span> : `${row.a}${row.unit}`}
                        </td>
                        <td
                          className={`py-3 px-2 text-right tabular-nums ${
                            row.diff !== null && row.diff > 0 ? "font-semibold" : ""
                          }`}
                        >
                          {row.b === null ? <span className="text-line">―</span> : `${row.b}${row.unit}`}
                        </td>
                        <td className="py-3 pl-2 text-right tabular-nums text-muted">
                          {label === null ? (
                            <span className="text-line">―</span>
                          ) : label === "같음" ? (
                            label
                          ) : (
                            `${label}${row.unit}`
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-xs text-muted">
            차이는 <span className="font-medium">{itemB.name}</span> 기준입니다 (오른쪽 − 왼쪽).
            ―는 아직 안 재어 둔 항목입니다.
          </p>
        </div>
      ) : (
        <p className="mt-10 rounded-xl bg-mist px-6 py-12 text-center text-sm text-muted">
          견줄 옷 두 벌을 고르세요.
        </p>
      )}
    </div>
  );
}
