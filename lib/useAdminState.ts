"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminUser, DraftDraw, DrawMode, DrawRun, DrawTierPreview, ProofStatus, Winner } from "./adminTypes";
import { generateTicket } from "./useAppState";
import { Score } from "./types";
import { SEED_USERS } from "./seedUsers";

const USERS_KEY = "digitalheroes_admin_users_v1";
const DRAWS_KEY = "digitalheroes_admin_draws_v1";
const DRAFT_KEY = "digitalheroes_admin_draft_v1";
const WINNERS_KEY = "digitalheroes_admin_winners_v1";

// A fixed share of each active subscription funds the prize pool (kept
// separate from the charity split, which is a separate percentage). The PRD
// leaves the exact rate unspecified — 30% is this build's assumption,
// applied consistently.
const POOL_FUNDING_RATE = 0.3;

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fall through
  }
  return fallback;
}
function saveJSON(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // best effort only
  }
}

function drawRandom(): number[] {
  const nums = new Set<number>();
  while (nums.size < 5) nums.add(1 + Math.floor(Math.random() * 49));
  return Array.from(nums).sort((a, b) => a - b);
}

function drawWeighted(users: AdminUser[]): number[] {
  const freq = new Array(50).fill(0); // index 1..49
  users.forEach((u) => {
    if (u.status !== "active") return;
    const ticket = generateTicket(u.scores);
    ticket?.forEach((n) => (freq[n] += 1));
  });
  const bag: number[] = [];
  for (let n = 1; n <= 49; n++) {
    const weight = freq[n] + 1; 
    for (let i = 0; i < weight; i++) bag.push(n);
  }
  const picked = new Set<number>();
  let guard = 0;
  while (picked.size < 5 && guard < 5000) {
    picked.add(bag[Math.floor(Math.random() * bag.length)]);
    guard++;
  }
  while (picked.size < 5) picked.add(1 + Math.floor(Math.random() * 49)); // safety net
  return Array.from(picked).sort((a, b) => a - b);
}

function computeTiers(users: AdminUser[], winningNumbers: number[], totalPool: number, rollover: number): DrawTierPreview[] {
  const tier5Pool = totalPool * 0.4 + rollover;
  const tier4Pool = totalPool * 0.35;
  const tier3Pool = totalPool * 0.25;
  const byTier: Record<3 | 4 | 5, string[]> = { 3: [], 4: [], 5: [] };

  users.forEach((u) => {
    if (u.status !== "active") return;
    const ticket = generateTicket(u.scores);
    if (!ticket) return;
    const matches = ticket.filter((n) => winningNumbers.includes(n)).length;
    if (matches === 5) byTier[5].push(u.id);
    else if (matches === 4) byTier[4].push(u.id);
    else if (matches === 3) byTier[3].push(u.id);
  });

  return [
    { tier: 5, poolShare: tier5Pool, winnerIds: byTier[5], amountEach: byTier[5].length ? tier5Pool / byTier[5].length : 0 },
    { tier: 4, poolShare: tier4Pool, winnerIds: byTier[4], amountEach: byTier[4].length ? tier4Pool / byTier[4].length : 0 },
    { tier: 3, poolShare: tier3Pool, winnerIds: byTier[3], amountEach: byTier[3].length ? tier3Pool / byTier[3].length : 0 },
  ];
}

function currentMonthLabel() {
  return new Date().toISOString().slice(0, 7);
}

export function useAdminState() {
  const [users, setUsers] = useState<AdminUser[]>(SEED_USERS);
  const [draws, setDraws] = useState<DrawRun[]>([]);
  const [draft, setDraft] = useState<DraftDraw>({ mode: "random", stage: "draft", simulatedNumbers: null, simulatedTiers: null });
  const [winners, setWinners] = useState<Winner[]>([]);
  const [jackpotRollover, setJackpotRollover] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setUsers(loadJSON(USERS_KEY, SEED_USERS));
    setDraws(loadJSON(DRAWS_KEY, []));
    setDraft(loadJSON(DRAFT_KEY, { mode: "random", stage: "draft", simulatedNumbers: null, simulatedTiers: null }));
    setWinners(loadJSON(WINNERS_KEY, []));
    setHydrated(true);
  }, []);

  useEffect(() => { if (hydrated) saveJSON(USERS_KEY, users); }, [users, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(DRAWS_KEY, draws); }, [draws, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(DRAFT_KEY, draft); }, [draft, hydrated]);
  useEffect(() => { if (hydrated) saveJSON(WINNERS_KEY, winners); }, [winners, hydrated]);

  const activeUsers = users.filter((u) => u.status === "active");
  const totalPool = activeUsers.reduce((sum, u) => sum + u.planPrice * POOL_FUNDING_RATE, 0);

  // ---------------- user management ----------------
  const editUserProfile = useCallback((id: string, fields: Partial<AdminUser>) => {
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, ...fields } : u)));
  }, []);

  const setUserSubscription = useCallback((id: string, status: AdminUser["status"]) => {
    setUsers((list) => list.map((u) => (u.id === id ? { ...u, status } : u)));
  }, []);

  const editUserScore = useCallback((userId: string, scoreId: string, date: string, points: number) => {
    setUsers((list) =>
      list.map((u) =>
        u.id === userId ? { ...u, scores: u.scores.map((s) => (s.id === scoreId ? { ...s, date, points } : s)) } : u
      )
    );
  }, []);

  const deleteUserScore = useCallback((userId: string, scoreId: string) => {
    setUsers((list) =>
      list.map((u) => (u.id === userId ? { ...u, scores: u.scores.filter((s) => s.id !== scoreId) } : u))
    );
  }, []);

  const addUserScore = useCallback((userId: string, date: string, points: number) => {
    setUsers((list) =>
      list.map((u) => {
        if (u.id !== userId) return u;
        if (u.scores.some((s) => s.date === date)) return u; // one entry per date, same rule as subscriber side
        let scores: Score[] = [...u.scores, { id: "s" + Date.now(), date, points }];
        if (scores.length > 5) {
          scores = scores.slice().sort((a, b) => a.date.localeCompare(b.date));
          scores.shift();
        }
        return { ...u, scores };
      })
    );
  }, []);

  // ---------------- draw management ----------------
  const setDrawMode = useCallback((mode: DrawMode) => {
    setDraft((d) => ({ ...d, mode }));
  }, []);

  const runSimulation = useCallback(() => {
    setDraft((d) => {
      const winningNumbers = d.mode === "random" ? drawRandom() : drawWeighted(users);
      const tiers = computeTiers(users, winningNumbers, totalPool, jackpotRollover);
      return { ...d, stage: "simulated", simulatedNumbers: winningNumbers, simulatedTiers: tiers };
    });
  }, [users, totalPool, jackpotRollover]);

  const publishResults = useCallback(() => {
    if (draft.stage !== "simulated" || !draft.simulatedNumbers || !draft.simulatedTiers) return;
    const month = currentMonthLabel();
    const drawId = "draw" + Date.now();

    const run: DrawRun = {
      id: drawId,
      month,
      mode: draft.mode,
      winningNumbers: draft.simulatedNumbers,
      tiers: draft.simulatedTiers,
      totalPool,
      jackpotRolloverIn: jackpotRollover,
      jackpotRolloverOut: draft.simulatedTiers.find((t) => t.tier === 5)!.winnerIds.length > 0 ? 0 : draft.simulatedTiers.find((t) => t.tier === 5)!.poolShare,
      publishedAt: new Date().toISOString(),
    };

    const newWinners: Winner[] = [];
    draft.simulatedTiers.forEach((t) => {
      t.winnerIds.forEach((uid) => {
        const u = users.find((x) => x.id === uid);
        if (!u) return;
        newWinners.push({
          id: "w" + Date.now() + "-" + uid,
          drawId,
          month,
          userId: uid,
          userName: u.name,
          tier: t.tier,
          matches: t.tier,
          amount: t.amountEach,
          proofStatus: "awaiting",
          payoutStatus: "pending",
        });
      });
    });

    setDraws((list) => [...list, run]);
    setWinners((list) => [...list, ...newWinners]);
    setJackpotRollover(run.jackpotRolloverOut);
    setDraft({ mode: draft.mode, stage: "draft", simulatedNumbers: null, simulatedTiers: null });
  }, [draft, users, totalPool, jackpotRollover]);

  // ---------------- winners management ----------------
  const setProofStatus = useCallback((id: string, status: ProofStatus) => {
    setWinners((list) => list.map((w) => (w.id === id ? { ...w, proofStatus: status } : w)));
  }, []);

  const markPaid = useCallback((id: string) => {
    setWinners((list) => list.map((w) => (w.id === id ? { ...w, payoutStatus: "paid" } : w)));
  }, []);

  return {
    hydrated,
    users,
    draws,
    draft,
    winners,
    jackpotRollover,
    totalPool,
    activeUserCount: activeUsers.length,
    editUserProfile,
    setUserSubscription,
    editUserScore,
    deleteUserScore,
    addUserScore,
    setDrawMode,
    runSimulation,
    publishResults,
    setProofStatus,
    markPaid,
  };
}
