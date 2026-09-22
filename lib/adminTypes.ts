import { Score } from "./types";

export type SubStatus = "active" | "lapsed" | "cancelled";
export type DrawMode = "random" | "algorithmic";
export type DrawStage = "draft" | "simulated" | "published";
export type ProofStatus = "awaiting" | "submitted" | "approved" | "rejected";
export type PayoutStatus = "pending" | "paid";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: "monthly" | "yearly";
  planPrice: number;
  status: SubStatus;
  joinedDate: string;
  charityId: string;
  charityPct: number;
  scores: Score[]; // rolling 5, same shape/rules as the subscriber side
}

export interface DrawTierPreview {
  tier: 3 | 4 | 5;
  poolShare: number;
  winnerIds: string[]; // user ids matching this tier, this run
  amountEach: number;
}

export interface DrawRun {
  id: string;
  month: string; // e.g. "2026-09"
  mode: DrawMode;
  winningNumbers: number[];
  tiers: DrawTierPreview[];
  totalPool: number;
  jackpotRolloverIn: number;
  jackpotRolloverOut: number;
  publishedAt: string;
}

export interface DraftDraw {
  mode: DrawMode;
  stage: DrawStage;
  simulatedNumbers: number[] | null;
  simulatedTiers: DrawTierPreview[] | null;
}

export interface Winner {
  id: string;
  drawId: string;
  month: string;
  userId: string;
  userName: string;
  tier: 3 | 4 | 5;
  matches: number;
  amount: number;
  proofStatus: ProofStatus;
  payoutStatus: PayoutStatus;
}
