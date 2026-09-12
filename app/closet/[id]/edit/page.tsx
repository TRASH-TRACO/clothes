import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { updateItem } from "@/app/actions/items";
import { ItemForm } from "@/components/item-form";
import { getBrands, getItem } from "@/lib/data";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "옷 수정" };

export default async function EditItemPage({ params }: PageProps<"/closet/[id]/edit">) {
  const { id } = await params;
  const user = await getUser();
  if (!user) redirect(`/login?next=/closet/${id}/edit`);

  const [item, brands] = await Promise.all([getItem(id), getBrands()]);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-xl px-6 py-12 lg:px-10">
      <p className="eyebrow">Edit item</p>
      <h1 className="display mt-2 mb-10 text-4xl sm:text-5xl">{item.name}</h1>
      <ItemForm userId={user.id} item={item} brands={brands} action={updateItem} />
    </div>
  );
}
