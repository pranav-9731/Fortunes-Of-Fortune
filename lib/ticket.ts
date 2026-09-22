import { Score } from "./types";

// Pure, deterministic — no DB access. A subscriber's monthly "ticket" is
// derived from their own logged scores so it only changes when their scores
// do, and the admin draw engine can recompute the same ticket for every
// active user from their scores alone.

function hashStr(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateTicket(scores: Score[]): number[] | null {
  if (scores.length < 5) return null;
  const seedStr = scores.map((s) => `${s.score_date}:${s.points}`).sort().join("|");
  const rng = mulberry32(hashStr(seedStr));
  const nums = new Set<number>();
  while (nums.size < 5) nums.add(1 + Math.floor(rng() * 49));
  return Array.from(nums).sort((a, b) => a - b);
}

export function fmtINR(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}
