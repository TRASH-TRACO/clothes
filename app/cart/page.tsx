import type { Metadata } from "next";
import Link from "next/link";

import { CartCard, wonLabel } from "@/components/cart-card";
import { getCartItems } from "@/lib/data";

export const metadata: Metadata = { title: "장바구니" };

/**
 * 사려고 봐 둔 옷.
 *
 * 옷장과 일부러 따로 둔다 — 아직 안 산 것이라 코디에도, 캘린더에도, 추천에도
 * 끼면 안 된다. 산 것은 지우지 않고 아래로 내린다 (또 사지 않으려고).
 */
export default async function CartPage() {
  const items = await getCartItems();
  const wanted = items.filter((item) => !item.bought_at);
  const bought = items.filter((item) => item.bought_at);

  // 아직 안 산 것의 값만 센다. 산 것까지 더하면 "얼마치가 남았나" 를 못 본다
  const total = wanted.reduce((sum, item) => sum + (item.price ?? 0), 0);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 lg:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Shopping list</p>
          <h1 className="display mt-2 text-5xl sm:text-6xl">장바구니</h1>
          {wanted.length > 0 ? (
            <p className="mt-3 text-sm text-muted">
              {wanted.length}개
              {total > 0 ? ` · 합계 ${wonLabel(total)}` : ""}
            </p>
          ) : null}
        </div>
        <Link href="/cart/new" className="btn-dark">
          담기
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl bg-mist px-6 py-20 text-center">
          <p className="display text-3xl text-line">Empty</p>
          <p className="mt-4 text-muted">
            사려고 봐 둔 옷을 링크와 함께 담아두세요. 열어 둔 탭을 대신합니다.
          </p>
          <Link href="/cart/new" className="btn-dark mt-6">
            첫 번째 담기
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {wanted.map((item) => (
            <CartCard key={item.id} item={item} />
          ))}

          {bought.length > 0 ? (
            <section className="pt-6">
              <h2 className="eyebrow mb-4 border-t border-line pt-6">산 것 {bought.length}</h2>
              <div className="space-y-4">
                {bought.map((item) => (
                  <CartCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
