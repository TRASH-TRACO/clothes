"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { removeCompare, saveCompare } from "@/app/actions/compare";
import { ItemPhoto } from "@/components/item-photo";
import {
  agoLabel,
  compareRows,
  compareSignature,
  diffLabel,
  NEW_SIDE_NAME,
  type CompareSide,
} from "@/lib/compare";
import { CATEGORY_META, SLOT_ORDER, measurementFields, type Category } from "@/lib/categories";
import { FIT_LABELS, PART_FIT_LABELS, readPartFits } from "@/lib/feedback";
import type { CompareLogWithItems, Item } from "@/lib/types";

/** 오른쪽에 "아직 안 산 옷" 을 놓았을 때의 값 */
const NEW = "new";

/** 손이 멈추길 기다렸다가 기록한다. 고르는 도중마다 저장하면 줄만 늘어난다 */
const SAVE_DELAY_MS = 1500;

/**
 * 옷 두 벌을 골라 실측을 나란히 본다.
 *
 * 오른쪽은 옷장에 있는 옷 대신 **아직 안 산 옷**을 놓을 수도 있다.
 * 판매 페이지 실측표를 옮겨 적으면 가지고 있는 옷과 몇 cm 차이인지 바로 나온다.
 * 원래 이 기능을 쓰는 이유가 그거라서, 등록된 옷과 같은 자리에 놓는다.
 *
 * 고른 옷은 주소에 남긴다 (?a=&b=). 뒤로 가기가 통하고, 링크를 그대로 열면
 * 같은 비교가 뜬다 — "이거랑 이거 중에 뭐 살까" 를 남한테 보여주기도 한다.
 * 새로 살 옷은 주소에 안 담는다 (실측이 길어서 링크가 지저분해진다).
 * 대신 아래 "최근 비교" 에 일주일치가 남아서 거기서 다시 연다.
 */
export function CompareView({ items, initialA, initialB, history }: {
  items: Item[];
  initialA: string | null;
  initialB: string | null;
  history: CompareLogWithItems[];
}) {
  const router = useRouter();
  const [a, setA] = useState(initialA ?? "");
  const [b, setB] = useState(initialB ?? "");

  // 아직 안 산 옷 (b === NEW 일 때만 쓴다)
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<Category | null>(null);
  /** 입력 중에는 글자로 들고 있는다. "4" 를 "4." 로 고치는 중에 지워지면 안 된다 */
  const [newValues, setNewValues] = useState<Record<string, string>>({});

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const itemA = byId.get(a) ?? null;
  const itemB = b === NEW ? null : (byId.get(b) ?? null);
  const usingNew = b === NEW;

  // 분류 목록이 길어도 찾기 쉽게 분류별로 묶는다
  const groups = useMemo(
    () =>
      SLOT_ORDER.map((slot) => ({
        slot,
        items: items.filter((item) => item.category === slot),
      })).filter((group) => group.items.length > 0),
    [items],
  );

  /** 새로 살 옷의 분류. 안 골랐으면 기준 옷과 같은 분류로 본다 (보통 같은 걸 견준다) */
  const categoryB: Category | null = itemB?.category ?? newCategory ?? itemA?.category ?? null;

  /** 적어 둔 글자 중 숫자로 읽히는 것만. 그 분류에 있는 항목만 본다 */
  const parsedNew: Record<string, number> = {};
  if (categoryB) {
    for (const field of measurementFields(categoryB)) {
      const value = Number(newValues[field.key]);
      if (newValues[field.key] && Number.isFinite(value) && value > 0) {
        parsedNew[field.key] = value;
      }
    }
  }

  const nameB = itemB?.name ?? (newName.trim() || NEW_SIDE_NAME);
  const valuesB = itemB?.measurements ?? (usingNew ? parsedNew : null);
  const ready = Boolean(itemA) && (Boolean(itemB) || (usingNew && categoryB !== null));

  const notesA = readPartFits(itemA?.fit_notes);
  // 아직 안 산 옷은 입어본 적이 없으니 부위별 느낌도 없다
  const notesB = readPartFits(itemB?.fit_notes);

  const rows =
    itemA && categoryB && ready
      ? compareRows(
          measurementFields(itemA.category),
          measurementFields(categoryB),
          itemA.measurements,
          valuesB,
        )
      : [];

  /** 지금 오른쪽에 놓인 게 무엇인지. 기록에 남길 때 쓴다 */
  const side: CompareSide | null = itemB
    ? { kind: "item", itemId: itemB.id }
    : usingNew && categoryB
      ? { kind: "new", name: newName, category: categoryB, measurements: parsedNew }
      : null;

  // 같은 걸 두 번 보내지 않는다 (router.refresh 로 다시 그려져도)
  const saved = useRef<string | null>(null);

  useEffect(() => {
    if (!itemA || !side) return;
    // 새로 살 옷은 숫자를 하나라도 적어야 기록한다. 적는 도중에 남기면 빈 줄만 생긴다.
    if (side.kind === "new" && Object.keys(side.measurements).length === 0) return;

    const key = `${compareSignature(itemA.id, side)}|${JSON.stringify(
      side.kind === "new" ? side.measurements : {},
    )}`;
    if (saved.current === key) return;

    const timer = setTimeout(async () => {
      // 기록은 곁다리다. 못 남겨도 보던 비교는 그대로 있어야 한다.
      try {
        const result = await saveCompare(itemA.id, side);
        if (!result.ok) return;
        saved.current = key;
        // 아래 "최근 비교" 를 새로 받아온다. 화면에 친 값은 그대로 남는다.
        router.refresh();
      } catch {
        /* 못 남겼으면 다음에 다시 시도한다 */
      }
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
    // side 는 매번 새 객체라 값으로 비교할 것들만 적는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemA?.id, itemB?.id, usingNew, categoryB, newName, JSON.stringify(parsedNew)]);

  /** 주소만 바꾼다. 서버를 다시 부를 이유가 없다 (옷 목록은 이미 들고 있다) */
  function sync(nextA: string, nextB: string) {
    const params = new URLSearchParams();
    if (nextA) params.set("a", nextA);
    if (nextB) params.set("b", nextB);
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }

  function pick(target: "a" | "b", value: string) {
    if (target === "a") {
      setA(value);
      sync(value, b);
      return;
    }
    setB(value);
    // 새로 살 옷으로 넘어가면 분류를 기준 옷에 맞춰 둔다. 대개 같은 걸 견준다.
    if (value === NEW && !newCategory) setNewCategory(itemA?.category ?? null);
    sync(a, value);
  }

  function pickNewCategory(next: Category) {
    // 분류가 바뀌면 항목이 달라지므로 적어 둔 숫자는 지운다
    if (next !== categoryB) setNewValues({});
    setNewCategory(next);
  }

  function swap() {
    // 새로 살 옷은 왼쪽(기준)에 놓을 수 없다. 기준은 이미 가지고 있는 옷이어야
    // "그거보다 몇 cm 크다" 가 말이 된다.
    if (usingNew) return;
    setA(b);
    setB(a);
    sync(b, a);
  }

  /** 기록 한 줄을 다시 연다 */
  function reopen(log: CompareLogWithItems) {
    setA(log.base_item_id);
    if (log.other_item_id) {
      setB(log.other_item_id);
      sync(log.base_item_id, log.other_item_id);
      return;
    }
    setB(NEW);
    setNewName(log.other_name ?? "");
    setNewCategory(log.other_category);
    setNewValues(
      Object.fromEntries(
        Object.entries(log.other_measurements ?? {}).map(([key, value]) => [key, String(value)]),
      ),
    );
    sync(log.base_item_id, NEW);
    // 다시 연 것도 본 것이니 목록 맨 위로 올려 준다
    saved.current = null;
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4">
        {(["a", "b"] as const).map((target) => {
          const value = target === "a" ? a : b;
          const item = target === "a" ? itemA : itemB;
          return (
            <div key={target}>
              <label className="label" htmlFor={`pick-${target}`}>
                {target === "a" ? "기준 (가진 옷)" : "비교할 옷"}
              </label>
              <select
                id={`pick-${target}`}
                value={value}
                onChange={(event) => pick(target, event.target.value)}
                className="field"
              >
                <option value="">고르기</option>
                {/* 살까 말까가 이 기능의 본론이라 맨 위에 둔다 */}
                {target === "b" && <option value={NEW}>+ 새로 살 옷 (실측 직접 입력)</option>}
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
                ) : target === "b" && usingNew ? (
                  <div className="flex aspect-square items-center justify-center rounded-xl border-2 border-dashed border-line px-3 text-center">
                    <p className="text-sm text-muted">
                      {newName.trim() || NEW_SIDE_NAME}
                      <span className="mt-1 block text-xs text-line">아직 옷장에 없는 옷</span>
                    </p>
                  </div>
                ) : (
                  <div className="aspect-square rounded-xl border-2 border-dashed border-line" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {usingNew ? (
        <section className="mt-8 rounded-xl bg-mist p-5">
          <h2 className="eyebrow">새로 살 옷</h2>
          <p className="mt-2 text-sm text-muted">
            판매 페이지의 실측표를 그대로 옮겨 적으세요. 아는 칸만 채우면 됩니다.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label mb-1" htmlFor="new-name">
                이름
              </label>
              <input
                id="new-name"
                type="text"
                maxLength={80}
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="무신사 오버핏 반팔 L"
                className="field"
              />
            </div>
            <div>
              <label className="label mb-1" htmlFor="new-category">
                분류
              </label>
              <select
                id="new-category"
                value={categoryB ?? ""}
                onChange={(event) => pickNewCategory(event.target.value as Category)}
                className="field"
              >
                {SLOT_ORDER.map((slot) => (
                  <option key={slot} value={slot}>
                    {CATEGORY_META[slot].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {categoryB ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {measurementFields(categoryB).map((field) => (
                <div key={field.key}>
                  {/* 라벨에 괄호가 있는 칸이 있어 단위는 괄호 없이 붙인다 */}
                  <label className="label mb-1" htmlFor={`new-m-${field.key}`}>
                    {field.label} <span className="text-muted">{field.unit}</span>
                  </label>
                  {field.hint && <p className="mb-2 text-xs text-muted">{field.hint}</p>}
                  <input
                    id={`new-m-${field.key}`}
                    type="number"
                    step="0.1"
                    min="0"
                    inputMode="decimal"
                    placeholder={field.placeholder}
                    value={newValues[field.key] ?? ""}
                    onChange={(event) =>
                      setNewValues((prev) => ({ ...prev, [field.key]: event.target.value }))
                    }
                    className="field"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {itemA && ready ? (
        <div className="mt-10">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="eyebrow">실측 비교</h2>
            {itemB ? (
              <button
                type="button"
                onClick={swap}
                className="text-sm underline underline-offset-4 hover:text-muted"
              >
                좌우 바꾸기
              </button>
            ) : null}
          </div>

          {rows.length === 0 ? (
            <p className="rounded-xl bg-mist px-6 py-10 text-center text-sm text-muted">
              {usingNew
                ? "위에 실측을 적으면 여기에 차이가 나옵니다."
                : "두 벌 다 실측이 비어 있습니다. 옷 수정에서 적어두면 여기서 견줄 수 있습니다."}
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
                    <th className="truncate py-3 px-2 text-right font-medium" title={nameB}>
                      {nameB}
                    </th>
                    <th className="py-3 pl-2 text-right font-medium text-muted">차이</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const label = diffLabel(row.diff);
                    return (
                      <tr key={row.key} className="border-b border-line/70">
                        <td className="py-3 pr-2 text-muted">
                          {row.label}
                          {/* 숫자 밑에 그 사람이 그 숫자를 어떻게 느꼈는지 */}
                          {notesA[row.key] || notesB[row.key] ? (
                            <span className="mt-0.5 block text-[11px] text-line">
                              {notesA[row.key] ? `← ${PART_FIT_LABELS[notesA[row.key]]}` : ""}
                              {notesA[row.key] && notesB[row.key] ? " · " : ""}
                              {notesB[row.key] ? `${PART_FIT_LABELS[notesB[row.key]]} →` : ""}
                            </span>
                          ) : null}
                        </td>
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
            차이는 <span className="font-medium">{nameB}</span> 기준입니다 (오른쪽 − 왼쪽).
            ―는 아직 안 재어 둔 항목입니다.
          </p>
        </div>
      ) : (
        <p className="mt-10 rounded-xl bg-mist px-6 py-12 text-center text-sm text-muted">
          가진 옷을 고르고, 견줄 옷이나 새로 살 옷을 고르세요.
        </p>
      )}

      <CompareHistory history={history} onReopen={reopen} />
    </div>
  );
}

/**
 * 최근에 견준 것들. 일주일치만 남는다 (그 뒤는 저장할 때 지워진다).
 * 살까 말까는 며칠 걸리는 결정이라, 어제 뭐랑 견줬는지 다시 열 수 있어야 한다.
 */
function CompareHistory({
  history,
  onReopen,
}: {
  history: CompareLogWithItems[];
  onReopen: (log: CompareLogWithItems) => void;
}) {
  if (history.length === 0) return null;

  return (
    <section className="mt-16 border-t border-line pt-8">
      <h2 className="eyebrow">최근 비교</h2>
      <p className="mt-2 text-sm text-muted">최근 일주일치만 남습니다.</p>

      <ul className="mt-5 divide-y divide-line">
        {history.map((log) => {
          const other = log.other?.name ?? log.other_name ?? NEW_SIDE_NAME;
          return (
            <li key={log.id} className="flex items-center gap-3 py-3">
              <button
                type="button"
                onClick={() => onReopen(log)}
                className="min-w-0 flex-1 text-left"
              >
                <p className="truncate text-sm">
                  <span className="font-medium">{log.base?.name ?? "지워진 옷"}</span>
                  <span className="mx-1.5 text-line">↔</span>
                  <span className={log.other_item_id ? "font-medium" : "font-medium text-accent"}>
                    {other}
                  </span>
                </p>
                {/* 서버에서 그린 "방금" 이 클라이언트에서 "1분 전" 이 될 수 있다.
                    분 단위라 어긋나 봐야 한 칸이고, 맞추자고 효과를 걸 값은 아니다. */}
                <p className="mt-0.5 text-xs text-muted" suppressHydrationWarning>
                  {log.other_item_id ? "옷장에 있는 옷" : "새로 살 옷"} ·{" "}
                  {agoLabel(log.created_at)}
                </p>
              </button>
              {/* 서버 액션이 revalidatePath 를 부르므로 목록은 알아서 다시 그려진다 */}
              <button
                type="button"
                onClick={() => void removeCompare(log.id).catch(() => {})}
                className="shrink-0 text-xs text-muted hover:text-ink"
              >
                지우기
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
