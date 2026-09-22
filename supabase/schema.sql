-- Digital Heroes
-- Complete Supabase database schema
--
-- This script creates the application schema, triggers, functions,
-- indexes, RLS policies, and automatically repairs missing profile
-- rows for existing auth.users accounts.
--
-- It does NOT delete auth.users or application data.
-- It does NOT insert sample/seed data.


-- ==============================================================
-- EXTENSIONS
-- ==============================================================

create extension if not exists "pgcrypto";


-- ==============================================================
-- CHARITIES
-- ==============================================================

create table if not exists public.charities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  blurb text not null default '',
  media_note text not null default '',
  event text not null default '',
  created_at timestamptz not null default now()
);


-- ==============================================================
-- PROFILES
-- ==============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'subscriber'
    check (role in ('subscriber', 'admin')),
  plan text
    check (plan in ('monthly', 'yearly')),
  plan_price numeric not null default 0,
  status text not null default 'inactive'
    check (status in ('inactive', 'active', 'lapsed', 'cancelled')),
  charity_id uuid references public.charities(id) on delete set null,
  charity_pct int not null default 10
    check (charity_pct between 10 and 100),
  onboarded boolean not null default false,
  joined_date date not null default current_date,
  renew_date date,
  created_at timestamptz not null default now()
);

create index if not exists profiles_status_idx
  on public.profiles(status);


-- ==============================================================
-- SCORES
-- ==============================================================

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  score_date date not null,
  points int not null check (points between 1 and 45),
  created_at timestamptz not null default now(),
  unique (user_id, score_date)
);

create index if not exists scores_user_idx
  on public.scores(user_id);


-- ==============================================================
-- ROLLING-5 ENFORCEMENT
-- ==============================================================

create or replace function public.enforce_rolling_five()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.scores
  where user_id = new.user_id
    and id not in (
      select id
      from public.scores
      where user_id = new.user_id
      order by score_date desc
      limit 5
    );

  return new;
end;
$$;

drop trigger if exists trg_rolling_five on public.scores;

create trigger trg_rolling_five
after insert on public.scores
for each row
execute function public.enforce_rolling_five();


-- ==============================================================
-- DONATIONS
-- ==============================================================

create table if not exists public.donations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric not null check (amount > 0),
  created_at timestamptz not null default now()
);


-- ==============================================================
-- DRAWS
-- ==============================================================

create table if not exists public.draws (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  mode text not null
    check (mode in ('random', 'algorithmic')),
  winning_numbers int[] not null,
  total_pool numeric not null,
  jackpot_rollover_in numeric not null default 0,
  jackpot_rollover_out numeric not null default 0,
  tiers jsonb not null,
  published_at timestamptz not null default now()
);


-- ==============================================================
-- WINNERS
-- ==============================================================

create table if not exists public.winners (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tier int not null check (tier in (3, 4, 5)),
  matches int not null,
  amount numeric not null,
  proof_url text,
  proof_status text not null default 'awaiting'
    check (
      proof_status in (
        'awaiting',
        'submitted',
        'approved',
        'rejected'
      )
    ),
  payout_status text not null default 'pending'
    check (payout_status in ('pending', 'paid')),
  created_at timestamptz not null default now()
);

create index if not exists winners_user_idx
  on public.winners(user_id);


-- ==============================================================
-- AUTH: CREATE PROFILE AUTOMATICALLY
-- ==============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    name
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_handle_new_user on auth.users;

create trigger trg_handle_new_user
after insert on auth.users
for each row
execute function public.handle_new_user();


-- ==============================================================
-- REPAIR EXISTING AUTH USERS
-- ==============================================================
-- This is the important addition.
--
-- If a user already exists in auth.users but their profile was
-- never created because the trigger was missing, create it now.
--
-- This means your existing test account does NOT need to be deleted.

insert into public.profiles (
  id,
  email,
  name
)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data->>'name', '')
from auth.users u
where u.email is not null
  and not exists (
    select 1
    from public.profiles p
    where p.id = u.id
  )
on conflict (id) do nothing;


-- ==============================================================
-- IS_ADMIN()
-- ==============================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;


-- ==============================================================
-- PROFILE FIELD PROTECTION
-- ==============================================================

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then

    if new.role <> old.role then
      raise exception 'not permitted to change role';
    end if;

    if new.id <> old.id then
      raise exception 'not permitted';
    end if;

  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_fields
on public.profiles;

create trigger trg_protect_profile_fields
before update on public.profiles
for each row
execute function public.protect_profile_fields();


-- ==============================================================
-- WINNER FIELD PROTECTION
-- ==============================================================

create or replace function public.protect_winner_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then

    if new.tier <> old.tier
       or new.matches <> old.matches
       or new.amount <> old.amount
       or new.payout_status <> old.payout_status
       or new.draw_id <> old.draw_id
       or new.user_id <> old.user_id then

      raise exception 'not permitted to modify this field';

    end if;

    if old.proof_status <> 'awaiting'
       or new.proof_status <> 'submitted' then

      raise exception 'invalid proof status transition';

    end if;

  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_winner_fields
on public.winners;

create trigger trg_protect_winner_fields
before update on public.winners
for each row
execute function public.protect_winner_fields();


-- ==============================================================
-- ROW LEVEL SECURITY
-- ==============================================================

alter table public.profiles enable row level security;
alter table public.charities enable row level security;
alter table public.scores enable row level security;
alter table public.donations enable row level security;
alter table public.draws enable row level security;
alter table public.winners enable row level security;


-- ==============================================================
-- PROFILES POLICIES
-- ==============================================================

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_update on public.profiles;

create policy profiles_select
on public.profiles
for select
using (
  auth.uid() = id
  or public.is_admin()
);

create policy profiles_update
on public.profiles
for update
using (
  auth.uid() = id
  or public.is_admin()
);


-- ==============================================================
-- CHARITIES POLICIES
-- ==============================================================

drop policy if exists charities_select on public.charities;
drop policy if exists charities_write on public.charities;

create policy charities_select
on public.charities
for select
using (
  auth.role() = 'authenticated'
);

create policy charities_write
on public.charities
for all
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


-- ==============================================================
-- SCORES POLICIES
-- ==============================================================

drop policy if exists scores_select on public.scores;
drop policy if exists scores_insert on public.scores;
drop policy if exists scores_update on public.scores;
drop policy if exists scores_delete on public.scores;

create policy scores_select
on public.scores
for select
using (
  auth.uid() = user_id
  or public.is_admin()
);

create policy scores_insert
on public.scores
for insert
with check (
  auth.uid() = user_id
  or public.is_admin()
);

create policy scores_update
on public.scores
for update
using (
  auth.uid() = user_id
  or public.is_admin()
);

create policy scores_delete
on public.scores
for delete
using (
  auth.uid() = user_id
  or public.is_admin()
);


-- ==============================================================
-- DONATIONS POLICIES
-- ==============================================================

drop policy if exists donations_select on public.donations;
drop policy if exists donations_insert on public.donations;

create policy donations_select
on public.donations
for select
using (
  auth.uid() = user_id
  or public.is_admin()
);

create policy donations_insert
on public.donations
for insert
with check (
  auth.uid() = user_id
);


-- ==============================================================
-- DRAWS POLICIES
-- ==============================================================

drop policy if exists draws_select on public.draws;
drop policy if exists draws_insert on public.draws;

create policy draws_select
on public.draws
for select
using (
  auth.role() = 'authenticated'
);

create policy draws_insert
on public.draws
for insert
with check (
  public.is_admin()
);


-- ==============================================================
-- WINNERS POLICIES
-- ==============================================================

drop policy if exists winners_select on public.winners;
drop policy if exists winners_insert on public.winners;
drop policy if exists winners_update on public.winners;

create policy winners_select
on public.winners
for select
using (
  auth.uid() = user_id
  or public.is_admin()
);

create policy winners_insert
on public.winners
for insert
with check (
  public.is_admin()
);

create policy winners_update
on public.winners
for update
using (
  auth.uid() = user_id
  or public.is_admin()
)
with check (
  auth.uid() = user_id
  or public.is_admin()
);


-- ==============================================================
-- PUBLIC AGGREGATE STATS
-- ==============================================================

create or replace function public.get_public_stats()
returns json
language sql
security definer
set search_path = public
stable
as $$
  select json_build_object(

    'active_subscribers',
    (
      select count(*)
      from public.profiles
      where status = 'active'
    ),

    'charities_count',
    (
      select count(*)
      from public.charities
    ),

    'charity_funds_raised',
    coalesce(
      (
        select sum(
          p.plan_price * p.charity_pct / 100.0
        )
        from public.profiles p
        where p.status = 'active'
      ),
      0
    )
    +
    coalesce(
      (
        select sum(amount)
        from public.donations
      ),
      0
    ),

    'current_pool',
    coalesce(
      (
        select sum(
          p.plan_price * 0.30
        )
        from public.profiles p
        where p.status = 'active'
      ),
      0
    )

  );
$$;


-- ==============================================================
-- PUBLIC STATS PERMISSION
-- ==============================================================

grant execute
on function public.get_public_stats()
to anon, authenticated;