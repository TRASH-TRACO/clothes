import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { deleteItem } from "@/app/actions/items";
import { ColorDot } from "@/components/color-dot";
import { ItemPhoto } from "@/components/item-photo";
import { CATEGORY_META, measurementFields } from "@/lib/categories";
import { getItem } from "@/lib/data";

export async function generateMetadata({ params }: PageProps<"/closet/[id]">): Promise<Metadata> {
  const { id } = await params;
  const item = await getItem(id);
  return { title: item?.name ?? "옷" };
}

export default async function ItemPage({ params }: PageProps<"/closet/[id]">) {
  const { id } = await params;
  const item = await getItem(id);
  if (!item) notFound();

  const fields = measurementFields(item.category).filter(
    (field) => typeof item.measurements?.[field.key] === "number",
  );

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
      <Link href="/closet" className="text-sm text-muted underline underline-offset-4">
        ← 옷장으로
      </Link>

      <div className="mt-6 grid gap-12 lg:grid-cols-2">
        <ItemPhoto
          path={item.photo_path}
          alt={item.name}
          category={item.category}
          priority
          className="aspect-square rounded-2xl"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />

        <div>
          <p className="eyebrow">{CATEGORY_META[item.category].label}</p>
          <h1 className="display mt-3 text-5xl">{item.name}</h1>
          {item.brand ? <p className="mt-3 text-lg text-muted">{item.brand}</p> : null}

          <dl className="mt-8 space-y-3 border-t border-line pt-8 text-sm">
            <div className="flex gap-4">
              <dt className="w-24 shrink-0 text-muted">색상</dt>
              <dd className="flex items-center gap-2 font-medium">
                <ColorDot hex={item.color_hex} size={14} />
                {item.color_name}
              </dd>
            </div>
            {item.size_label ? (
              <div className="flex gap-4">
                <dt className="w-24 shrink-0 text-muted">사이즈</dt>
                <dd className="font-medium">{item.size_label}</dd>
              </div>
            ) : null}
            <div className="flex gap-4">
              <dt className="w-24 shrink-0 text-muted">등록일</dt>
              <dd className="font-medium">
                {new Date(item.created_at).toLocaleDateString("ko-KR")}
              </dd>
            </div>
          </dl>

          <section className="mt-8 border-t border-line pt-8">
            <h2 className="eyebrow mb-4">실측</h2>
            {fields.length === 0 ? (
              <p className="text-sm text-muted">기록된 실측값이 없습니다.</p>
            ) : (
              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-line sm:grid-cols-3">
                {fields.map((field) => (
                  <div key={field.key} className="bg-paper px-4 py-5">
                    <p className="text-xs uppercase tracking-[0.12em] text-muted">{field.label}</p>
                    <p className="display mt-2 text-3xl">
                      {item.measurements[field.key]}
                      <span className="ml-1 text-base">{field.unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {item.notes ? (
            <section className="mt-8 border-t border-line pt-8">
              <h2 className="eyebrow mb-3">메모</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.notes}</p>
            </section>
          ) : null}

          <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-line pt-8">
            <Link href={`/closet/${item.id}/edit`} className="btn-dark">
              수정하기
            </Link>
            <Link href={`/studio?${item.category}=${item.id}`} className="btn-light">
              이 옷으로 코디하기
            </Link>
            <form action={deleteItem} className="ml-auto">
              <input type="hidden" name="id" value={item.id} />
              <button type="submit" className="text-sm text-muted underline underline-offset-4 hover:text-accent">
                삭제
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
