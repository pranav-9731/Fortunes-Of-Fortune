import { AdminUser } from "./adminTypes";

// Deterministic seed dates/points so the demo dataset is stable across reloads
// until an admin edits it.
export const SEED_USERS: AdminUser[] = [
  {
    id: "u1", name: "Rohan Malhotra", email: "rohan.m@example.com", plan: "yearly", planPrice: 4999,
    status: "active", joinedDate: "2026-01-14", charityId: "nirmal", charityPct: 22,
    scores: [
      { id: "s1", user_id: "u1", score_date: "2026-09-18", points: 39 },
      { id: "s2", user_id: "u1", score_date: "2026-09-11", points: 34 },
      { id: "s3", user_id: "u1", score_date: "2026-09-03", points: 36 },
      { id: "s4", user_id: "u1", score_date: "2026-08-27", points: 31 },
      { id: "s5", user_id: "u1", score_date: "2026-08-19", points: 33 },
    ],
  },
  {
    id: "u2", name: "Ananya Sen", email: "ananya.sen@example.com", plan: "monthly", planPrice: 499,
    status: "active", joinedDate: "2026-03-02", charityId: "vidya", charityPct: 15,
    scores: [
      { id: "s6", user_id: "u2", score_date: "2026-09-17", points: 28 },
      { id: "s7", user_id: "u2", score_date: "2026-09-10", points: 30 },
      { id: "s8", user_id: "u2", score_date: "2026-09-02", points: 26 },
      { id: "s9", user_id: "u2", score_date: "2026-08-24", points: 32 },
      { id: "s10", user_id: "u2", score_date: "2026-08-16", points: 29 },
    ],
  },
  {
    id: "u3", name: "Karan Bedi", email: "karan.bedi@example.com", plan: "monthly", planPrice: 499,
    status: "active", joinedDate: "2026-05-20", charityId: "harit", charityPct: 10,
    scores: [
      { id: "s11", user_id: "u3", score_date: "2026-09-15", points: 37 },
      { id: "s12", user_id: "u3", score_date: "2026-09-08", points: 35 },
    ],
  },
  {
    id: "u4", name: "Priya Nair", email: "priya.nair@example.com", plan: "yearly", planPrice: 4999,
    status: "lapsed", joinedDate: "2025-11-09", charityId: "asha", charityPct: 30,
    scores: [
      { id: "s13", user_id: "u4", score_date: "2026-07-30", points: 40 },
      { id: "s14", user_id: "u4", score_date: "2026-07-22", points: 38 },
      { id: "s15", user_id: "u4", score_date: "2026-07-14", points: 41 },
      { id: "s16", user_id: "u4", score_date: "2026-07-06", points: 36 },
      { id: "s17", user_id: "u4", score_date: "2026-06-28", points: 39 },
    ],
  },
  {
    id: "u5", name: "Vivaan Kapoor", email: "vivaan.k@example.com", plan: "monthly", planPrice: 499,
    status: "active", joinedDate: "2026-06-11", charityId: "nirmal", charityPct: 10,
    scores: [
      { id: "s18", user_id: "u5", score_date: "2026-09-16", points: 33 },
      { id: "s19", user_id: "u5", score_date: "2026-09-09", points: 31 },
      { id: "s20", user_id: "u5", score_date: "2026-09-01", points: 29 },
      { id: "s21", user_id: "u5", score_date: "2026-08-25", points: 34 },
      { id: "s22", user_id: "u5", score_date: "2026-08-18", points: 30 },
    ],
  },
  {
    id: "u6", name: "Ishita Rao", email: "ishita.rao@example.com", plan: "yearly", planPrice: 4999,
    status: "active", joinedDate: "2026-02-27", charityId: "vidya", charityPct: 18,
    scores: [
      { id: "s23", user_id: "u6", score_date: "2026-09-14", points: 27 },
      { id: "s24", user_id: "u6", score_date: "2026-09-07", points: 25 },
      { id: "s25", user_id: "u6", score_date: "2026-08-30", points: 30 },
      { id: "s26", user_id: "u6", score_date: "2026-08-23", points: 28 },
      { id: "s27", user_id: "u6", score_date: "2026-08-15", points: 26 },
    ],
  },
  {
    id: "u7", name: "Dev Chatterjee", email: "dev.c@example.com", plan: "monthly", planPrice: 499,
    status: "cancelled", joinedDate: "2025-09-01", charityId: "harit", charityPct: 10,
    scores: [
      { id: "s28", user_id: "u7", score_date: "2026-05-12", points: 32 },
    ],
  },
  {
    id: "u8", name: "Meher Gill", email: "meher.gill@example.com", plan: "monthly", planPrice: 499,
    status: "active", joinedDate: "2026-08-04", charityId: "asha", charityPct: 12,
    scores: [
      { id: "s29", user_id: "u8", score_date: "2026-09-18", points: 35 },
      { id: "s30", user_id: "u8", score_date: "2026-09-11", points: 37 },
      { id: "s31", user_id: "u8", score_date: "2026-09-04", points: 34 },
      { id: "s32", user_id: "u8", score_date: "2026-08-28", points: 36 },
      { id: "s33", user_id: "u8", score_date: "2026-08-20", points: 33 },
    ],
  },
];
