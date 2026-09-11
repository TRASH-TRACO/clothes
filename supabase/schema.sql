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
  -- 착장 사진. 옷 사진과 같은 clothes 버킷의 <user_id>/<uuid>.jpg
  photo_path text,
  created_at timestamptz not null default now()
);

-- 이미 outfits 테이블이 있는 프로젝트를 위한 추가 (없으면 아무 일도 하지 않음)
alter table public.outfits add column if not exists photo_path text;

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

-- 5-1. 착장 기록 (하루에 한 줄) --------------------------------------
create table if not exists public.wear_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  worn_on date not null,
  -- 저장한 코디에서 가져왔으면 그 코디를 가리킨다.
  -- 코디를 나중에 지워도 그날 입은 옷 기록은 남아야 하므로 set null.
  outfit_id uuid references public.outfits (id) on delete set null,
  memo text,
  created_at timestamptz not null default now(),
  unique (user_id, worn_on)
);

create index if not exists wear_logs_user_date_idx on public.wear_logs (user_id, worn_on desc);

-- 그날 입은 옷. 코디를 골랐어도 구성 옷을 그대로 복사해 둔다
-- (나중에 코디를 고쳐도 지난 기록은 그대로 남게)
create table if not exists public.wear_log_items (
  id uuid primary key default gen_random_uuid(),
  wear_log_id uuid not null references public.wear_logs (id) on delete cascade,
  item_id uuid not null references public.items (id) on delete cascade,
  unique (wear_log_id, item_id)
);

create index if not exists wear_log_items_log_idx on public.wear_log_items (wear_log_id);

alter table public.wear_logs enable row level security;
alter table public.wear_log_items enable row level security;

drop policy if exists "wear logs are private" on public.wear_logs;
create policy "wear logs are private" on public.wear_logs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "wear log items follow log owner" on public.wear_log_items;
create policy "wear log items follow log owner" on public.wear_log_items
  for all to authenticated
  using (
    exists (
      select 1 from public.wear_logs w
      where w.id = wear_log_items.wear_log_id and w.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.wear_logs w
      where w.id = wear_log_items.wear_log_id and w.user_id = auth.uid()
    )
    and exists (
      select 1 from public.items i
      where i.id = wear_log_items.item_id and i.user_id = auth.uid()
    )
  );

-- 5-2. 사용자 설정: 기본 지역 ----------------------------------------
-- 날씨는 "그날의 기록"이라 접속 위치로 추정하면 안 된다. 사용자가 정해 둔다.
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  place_name text not null,
  place_lat double precision not null,
  place_lon double precision not null,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "settings are private" on public.user_settings;
create policy "settings are private" on public.user_settings
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 그날 어디 있었는지 (여행 등). 비어 있으면 기본 지역으로 본다.
alter table public.wear_logs add column if not exists place_name text;
alter table public.wear_logs add column if not exists place_lat double precision;
alter table public.wear_logs add column if not exists place_lon double precision;

-- 5-3. 날짜별 날씨 기록 ----------------------------------------------
-- 지역을 따로 정해 둔 날(여행 등)의 날씨를 받아서 여기 넣어둔다.
-- 지역을 정하지 않은 날은 기본 지역으로 그때그때 불러오므로 저장하지 않는다.
-- 저장해 두면 예보 API가 주는 기간(과거 92일)이 지나도 기록이 남는다.
create table if not exists public.daily_weather (
  user_id uuid not null references auth.users (id) on delete cascade,
  on_date date not null,
  -- 어느 지역 기준으로 받은 값인지. 그 날짜 지역을 바꾸면 값이 달라지므로 다시 받는다.
  -- fetched_at 은 아직 지나지 않은 날의 예보가 낡았는지 판단하는 데 쓴다.
  place_name text not null,
  place_lat double precision not null,
  place_lon double precision not null,
  code smallint,
  temp_high double precision,
  temp_low double precision,
  rain_amount double precision,
  fetched_at timestamptz not null default now(),
  primary key (user_id, on_date)
);

alter table public.daily_weather enable row level security;

drop policy if exists "daily weather is private" on public.daily_weather;
create policy "daily weather is private" on public.daily_weather
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5-4. 한 줄 평가 ---------------------------------------------------
-- 그날 체감: 추웠다 / 적당 / 더웠다
alter table public.wear_logs
  add column if not exists felt text check (felt in ('cold', 'ok', 'hot'));

-- 코디 만족도: 별로다 / 적당 / 맘에 들었다
alter table public.outfits
  add column if not exists rating text check (rating in ('bad', 'ok', 'good'));

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
