// These mirror the Postgres schema in supabase/schema.sql (snake_case, on
// purpose, to keep the mapping between DB rows and app types 1:1 and avoid a
// silent-mismatch translation layer).

export interface Charity {
  id: string;
  name: string;
  blurb: string;
  media_note: string;
  event: string;
}

export type Plan = "monthly" | "yearly";
export type SubStatus = "inactive" | "active" | "lapsed" | "cancelled";

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: "subscriber" | "admin";
  plan: Plan | null;
  plan_price: number;
  status: SubStatus;
  charity_id: string | null;
  charity_pct: number;
  onboarded: boolean;
  joined_date: string;
  renew_date: string | null;
}

export interface Score {
  id: string;
  user_id: string;
  score_date: string;
  points: number;
}

export interface Donation {
  id: string;
  user_id: string;
  amount: number;
  created_at: string;
}

export type DrawMode = "random" | "algorithmic";

export interface DrawTierSnapshot {
  tier: 3 | 4 | 5;
  pool_share: number;
  winner_ids: string[];
  amount_each: number;
}

export interface Draw {
  id: string;
  month: string;
  mode: DrawMode;
  winning_numbers: number[];
  total_pool: number;
  jackpot_rollover_in: number;
  jackpot_rollover_out: number;
  tiers: DrawTierSnapshot[];
  published_at: string;
}

export type ProofStatus = "awaiting" | "submitted" | "approved" | "rejected";
export type PayoutStatus = "pending" | "paid";

export interface Winner {
  id: string;
  draw_id: string;
  user_id: string;
  tier: 3 | 4 | 5;
  matches: number;
  amount: number;
  proof_url: string | null;
  proof_status: ProofStatus;
  payout_status: PayoutStatus;
  created_at: string;
}

export const PLAN_PRICE: Record<Plan, number> = { monthly: 499, yearly: 4999 };
// Share of an active subscription that funds the prize pool. The PRD
// specifies "a fixed portion" without a number — 30% is this build's
// documented assumption (see README), separate from the charity split.
export const POOL_FUNDING_RATE = 0.3;
