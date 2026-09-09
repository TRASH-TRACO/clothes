import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createItem } from "@/app/actions/items";
import { ItemForm } from "@/components/item-form";
import { getBrands } from "@/lib/data";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "옷 등록" };

export default async function NewItemPage() {
  const [user, brands] = await Promise.all([getUser(), getBrands()]);
  if (!user) redirect("/login?next=/closet/new");

  return (
    <div className="mx-auto max-w-7xl px-6 py-12 lg:px-10">
      <p className="eyebrow">New item</p>
      <h1 className="display mt-2 mb-10 text-5xl sm:text-6xl">옷 등록</h1>
      <ItemForm userId={user.id} brands={brands} action={createItem} />
    </div>
  );
}
