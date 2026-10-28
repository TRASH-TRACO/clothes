import { ConfirmForm } from "@/components/confirm-form";
import { ItemPhoto } from "@/components/item-photo";
import { WarmLink } from "@/components/warm-link";
import { deleteCartItem, toggleBought } from "@/app/actions/cart";
import { CATEGORY_META } from "@/lib/categories";
import { safeUrl, urlLabel } from "@/lib/safe-url";
import type { CartItem } from "@/lib/types";

/** "129,000원" */
export function wonLabel(price: number | null) {
  return price === null ? null : `${price.toLocaleString("ko-KR")}원`;
}

export function CartCard({ item }: { item: CartItem }) {
  const bought = Boolean(item.bought_at);
  const link = safeUrl(item.url);
  const host = urlLabel(item.url);

  return (
    <div className={`surface flex gap-4 rounded-xl p-4 ${bought ? "opacity-55" : ""}`}>
      <WarmLink href={`/cart/${item.id}`} className="shrink-0">
        <ItemPhoto
          path={item.photo_path}
          alt={item.name}
          /* 분류를 안 정했으면 자리표시자 글자도 없다 */
          category={item.category ?? "top"}
          className="aspect-square w-24 rounded-lg"
          sizes="96px"
          compact
        />
      </WarmLink>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <WarmLink href={`/cart/${item.id}`} className="group block min-w-0">
              <p className="truncate font-semibold group-hover:underline">{item.name}</p>
              <p className="mt-0.5 truncate text-sm text-muted">
                {[item.brand, item.category ? CATEGORY_META[item.category].label : null]
                  .filter(Boolean)
                  .join(" · ") || " "}
              </p>
            </WarmLink>
          </div>
          {item.price !== null ? (
            <p className="shrink-0 text-sm font-semibold">{wonLabel(item.price)}</p>
          ) : null}
        </div>

        {/* 링크가 이 화면의 핵심이다. 못 거는 주소면 아예 안 보여준다 */}
        {link ? (
          <a
            href={link}
            target="_blank"
            rel="noreferrer noopener"
            className="mt-2 inline-flex max-w-full items-center gap-1 truncate text-sm
              underline underline-offset-4 hover:text-muted"
          >
            {host} ↗
          </a>
        ) : null}

        {item.memo ? (
          <p className="mt-2 line-clamp-2 text-sm text-muted">{item.memo}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <form action={toggleBought}>
            <input type="hidden" name="id" value={item.id} />
            <button type="submit" className={`chip ${bought ? "chip-active" : ""}`}>
              {bought ? "샀음" : "샀어요"}
            </button>
          </form>
          <ConfirmForm
            action={deleteCartItem}
            hidden={{ id: item.id }}
            label="지우기"
            triggerClassName="btn-ghost px-0 text-sm text-muted"
            title={`${item.name}을(를) 장바구니에서 지울까요?`}
            body="적어 둔 링크와 실측도 같이 사라집니다. 되돌릴 수 없습니다."
            confirmLabel="지우기"
          />
        </div>
      </div>
    </div>
  );
}
