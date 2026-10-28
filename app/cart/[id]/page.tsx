import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmForm } from "@/components/confirm-form";
import { PhotoCarousel } from "@/components/photo-carousel";
import { wonLabel } from "@/components/cart-card";
import { deleteCartItem, toggleBought } from "@/app/actions/cart";
import { CATEGORY_META, measurementFields } from "@/lib/categories";
import { getCartItem } from "@/lib/data";
import { safeUrl, urlLabel } from "@/lib/safe-url";

export async function generateMetadata({ params }: PageProps<"/cart/[id]">): Promise<Metadata> {
  const { id } = await params;
  const item = await getCartItem(id);
  return { title: item ? item.name : "장바구니" };
}

export default async function CartItemPage({ params }: PageProps<"/cart/[id]">) {
  const { id } = await params;
  const item = await getCartItem(id);
  if (!item) notFound();

  const link = safeUrl(item.url);
  const host = urlLabel(item.url);
  const bought = Boolean(item.bought_at);
  const fields = item.category
    ? measurementFields(item.category).filter(
        (field) => typeof item.measurements[field.key] === "number",
      )
    : [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-12 lg:px-10">
      <Link href="/cart" className="text-sm text-muted underline underline-offset-4 hover:text-ink">
        ← 장바구니
      </Link>

      <div className="mt-6 grid gap-8 sm:grid-cols-[240px_minmax(0,1fr)]">
        <PhotoCarousel
          paths={item.photo_path ? [item.photo_path] : []}
          alt={item.name}
          category={item.category ?? "top"}
        />

        <div>
          <p className="eyebrow">
            {[item.brand, item.category ? CATEGORY_META[item.category].label : null]
              .filter(Boolean)
              .join(" · ") || "Shopping list"}
          </p>
          <h1 className="display mt-2 text-4xl sm:text-5xl">{item.name}</h1>

          {item.price !== null ? (
            <p className="mt-4 text-xl font-semibold">{wonLabel(item.price)}</p>
          ) : null}

          {/* 링크가 이 화면의 핵심이다. 못 거는 주소면 아예 안 보여준다 */}
          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noreferrer noopener"
              className="btn-light mt-5 inline-flex"
            >
              {host} 에서 보기 ↗
            </a>
          ) : null}

          {bought ? (
            <p className="mt-5 inline-flex rounded-full bg-mist px-4 py-2 text-sm font-medium">
              샀습니다
            </p>
          ) : null}
        </div>
      </div>

      {fields.length > 0 ? (
        <section className="mt-12">
          <h2 className="display text-2xl">상품 페이지 실측</h2>
          <p className="mt-2 text-sm text-muted">
            판매 페이지에 적혀 있던 숫자입니다. 실측 비교에서 가진 옷과 견줘 보세요.
          </p>
          <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-line sm:grid-cols-3">
            {fields.map((field) => (
              <div key={field.key} className="bg-paper px-4 py-4">
                <p className="text-xs uppercase tracking-[0.12em] text-muted">{field.label}</p>
                <p className="mt-1 text-lg font-semibold">
                  {item.measurements[field.key]}
                  {field.unit}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {item.memo ? (
        <section className="mt-12">
          <h2 className="display text-2xl">메모</h2>
          <p className="mt-3 whitespace-pre-wrap text-muted">{item.memo}</p>
        </section>
      ) : null}

      <div className="mt-12 flex flex-wrap items-center gap-3 border-t border-line pt-8">
        <form action={toggleBought}>
          <input type="hidden" name="id" value={item.id} />
          <button type="submit" className={bought ? "btn-light" : "btn-dark"}>
            {bought ? "아직 안 샀어요" : "샀어요"}
          </button>
        </form>
        <Link href={`/cart/${item.id}/edit`} className="btn-light">
          고치기
        </Link>
        <Link href="/compare" className="btn-light">
          실측 비교
        </Link>
        <ConfirmForm
          action={deleteCartItem}
          hidden={{ id: item.id }}
          label="지우기"
          triggerClassName="btn-ghost px-0 text-sm text-muted"
          title={`${item.name}을(를) 지울까요?`}
          body="적어 둔 링크와 실측도 같이 사라집니다. 되돌릴 수 없습니다."
          confirmLabel="지우기"
        />
      </div>
    </div>
  );
}
