-- ---------------------------------------------------------------
-- Closet 앱 스키마
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 실행하세요.
-- 여러 번 실행해도 안전합니다.
-- ---------------------------------------------------------------

-- 1. 카테고리 enum -----------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'item_category') then
    create type item_category as enum ('hat', 'outer', 'top', 'bottom', 'shoes', 'acc');
  end if;
end $$;

-- 2. 옷 ----------------------------------------------------------
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  brand text,
  category item_category not null,
  color_name text not null,
  color_hex text not null default '#111111',
  size_label text,
  photo_path text,
  measurements jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists items_user_created_idx on public.items (user_id, created_at desc);
create index if not exists items_user_category_idx on public.items (user_id, category);

-- 3. 코디 --------------------------------------------------------
create table if not exists public.outfits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  memo text,
  created_at timestamptz not null default now()
);

create index if not exists outfits_user_created_idx on public.outfits (user_id, created_at desc);

-- 4. 코디 구성 (슬롯당 옷 하나) ------------------------------------
create table if not exists public.outfit_items (
  id uuid primary key default gen_random_uuid(),
  outfit_id uuid not null references public.outfits (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  slot item_category not null,
  unique (outfit_id, slot)
);

create index if not exists outfit_items_outfit_idx on public.outfit_items (outfit_id);
create index if not exists outfit_items_item_idx on public.outfit_items (item_id);

-- 5. RLS: 내 데이터만 보이고 내 데이터만 고칠 수 있다 ----------------
alter table public.items enable row level security;
alter table public.outfits enable row level security;
alter table public.outfit_items enable row level security;

drop policy if exists "items are private" on public.items;
create policy "items are private" on public.items
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "outfits are private" on public.outfits;
create policy "outfits are private" on public.outfits
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- outfit_items는 부모 outfit의 소유자만 다룰 수 있다
drop policy if exists "outfit items follow outfit owner" on public.outfit_items;
create policy "outfit items follow outfit owner" on public.outfit_items
  for all to authenticated
  using (
    exists (
      select 1 from public.outfits o
      where o.id = outfit_items.outfit_id and o.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.outfits o
      where o.id = outfit_items.outfit_id and o.user_id = auth.uid()
    )
    and exists (
      select 1 from public.items i
      where i.id = outfit_items.item_id and i.user_id = auth.uid()
    )
  );

-- 6. 사진 Storage 버킷 --------------------------------------------
-- private 버킷: 공개 URL로는 못 읽는다.
-- 읽기는 앱의 /api/photo 라우트가 로그인 세션으로 대신 받아온다.
insert into storage.buckets (id, name, public)
values ('clothes', 'clothes', false)
on conflict (id) do update set public = false;

-- 사진은 <user_id>/<uuid>.jpg 경로로 올린다. 폴더명이 본인 uid여야 한다.
drop policy if exists "clothes photos are readable" on storage.objects;
create policy "clothes photos are readable" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'clothes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "clothes photos are writable by owner" on storage.objects;
create policy "clothes photos are writable by owner" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'clothes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "clothes photos are updatable by owner" on storage.objects;
create policy "clothes photos are updatable by owner" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'clothes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "clothes photos are deletable by owner" on storage.objects;
create policy "clothes photos are deletable by owner" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'clothes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
