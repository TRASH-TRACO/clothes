import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CartForm } from "@/components/cart-form";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "장바구니에 담기" };

export default async function NewCartItemPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/cart/new");

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 lg:px-10">
      <p className="eyebrow">Shopping list</p>
      <h1 className="display mt-2 mb-10 text-5xl sm:text-6xl">장바구니에 담기</h1>
      <CartForm userId={user.id} />
    </div>
  );
}
