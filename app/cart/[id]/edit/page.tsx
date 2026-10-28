import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { CartForm } from "@/components/cart-form";
import { getCartItem } from "@/lib/data";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "장바구니 고치기" };

export default async function EditCartItemPage({ params }: PageProps<"/cart/[id]/edit">) {
  const { id } = await params;
  const [user, item] = await Promise.all([getUser(), getCartItem(id)]);
  if (!user) redirect(`/login?next=/cart/${id}/edit`);
  if (!item) notFound();

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 lg:px-10">
      <p className="eyebrow">Shopping list</p>
      <h1 className="display mt-2 mb-10 text-5xl sm:text-6xl">고치기</h1>
      <CartForm userId={user.id} item={item} />
    </div>
  );
}
