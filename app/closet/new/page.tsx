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

  // 폼이 단계마다 질문을 크게 띄우므로 큰 제목은 두지 않는다 (두 개가 겹쳐 보인다)
  return (
    <div className="mx-auto max-w-xl px-6 py-8 lg:px-10">
      <p className="eyebrow mb-6">New item</p>
      <ItemForm userId={user.id} brands={brands} action={createItem} />
    </div>
  );
}
