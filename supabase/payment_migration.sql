-- Run this once against an existing FortuneArc Supabase database.
-- The main schema.sql also contains the Razorpay subscription column for
-- fresh installs.

alter table public.profiles
  add column if not exists razorpay_subscription_id text;

create unique index if not exists profiles_razorpay_subscription_idx
  on public.profiles(razorpay_subscription_id)
  where razorpay_subscription_id is not null;
