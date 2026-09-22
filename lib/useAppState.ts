"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_STATE,
  DrawRecord,
  Plan,
  Score,
  BASE_POOL,
  PLAN_PRICE,
} from "./types";

type AppState = typeof DEFAULT_STATE;

const STORAGE_KEY = "digitalheroes_state_v1";

function loadState(): AppState {
  if (typeof window === "undefined") return DEFAULT_STATE;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (raw) {
      return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    }
  } catch (e) {
    // storage unavailable — fall back to defaults
  }

  return DEFAULT_STATE;
}

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

  const seedStr = scores
    .map((s) => `${s.score_date}:${s.points}`)
    .sort()
    .join("|");

  const rng = mulberry32(hashStr(seedStr));
  const nums = new Set<number>();

  while (nums.size < 5) {
    nums.add(1 + Math.floor(rng() * 49));
  }

  return Array.from(nums).sort((a, b) => a - b);
}

function drawRandomNumbers(): number[] {
  const nums = new Set<number>();

  while (nums.size < 5) {
    nums.add(1 + Math.floor(Math.random() * 49));
  }

  return Array.from(nums).sort((a, b) => a - b);
}

export function fmtINR(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

export function useAppState() {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // best effort only
    }
  }, [state, hydrated]);

  const completeOnboarding = useCallback(
    (plan: Plan, charityId: string, charityPct: number) => {
      const renew = new Date();

      renew.setMonth(
        renew.getMonth() + (plan === "yearly" ? 12 : 1)
      );

      setState((s) => ({
        ...s,
        onboarded: true,
        subActive: true,
        plan,
        planPrice: PLAN_PRICE[plan],
        renewDate: renew.toISOString().slice(0, 10),
        charityId,
        charityPct,
      }));
    },
    []
  );

  const cancelSubscription = useCallback(() => {
    setState((s) => ({
      ...s,
      subActive: false,
    }));
  }, []);

  const reopenSubscription = useCallback(() => {
    setState((s) => ({
      ...s,
      onboarded: false,
    }));
  }, []);

  const addScore = useCallback(
    (date: string, points: number): string | null => {
      let error: string | null = null;

      setState((s) => {
        if (s.scores.some((sc) => sc.score_date === date)) {
          error =
            "You already logged a round for this date — edit it below instead.";

          return s;
        }

        let scores: Score[] = [
          ...s.scores,
          {
            id: "s" + Date.now(),
            user_id: "",
            score_date: date,
            points,
          },
        ];

        if (scores.length > 5) {
          scores = scores
            .slice()
            .sort((a, b) =>
              a.score_date.localeCompare(b.score_date)
            );

          scores.shift();
        }

        return {
          ...s,
          scores,
        };
      });

      return error;
    },
    []
  );

  const editScore = useCallback(
    (id: string, date: string, points: number): string | null => {
      let error: string | null = null;

      setState((s) => {
        if (
          s.scores.some(
            (sc) => sc.score_date === date && sc.id !== id
          )
        ) {
          error = "Another round is already logged for that date.";

          return s;
        }

        return {
          ...s,
          scores: s.scores.map((sc) =>
            sc.id === id
              ? {
                  ...sc,
                  score_date: date,
                  points,
                }
              : sc
          ),
        };
      });

      return error;
    },
    []
  );

  const deleteScore = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      scores: s.scores.filter((sc) => sc.id !== id),
    }));
  }, []);

  const setCharity = useCallback((charityId: string) => {
    setState((s) => ({
      ...s,
      charityId,
    }));
  }, []);

  const setCharityPct = useCallback((charityPct: number) => {
    setState((s) => ({
      ...s,
      charityPct,
    }));
  }, []);

  const addDonation = useCallback((amount: number) => {
    setState((s) => ({
      ...s,
      independentTotal: s.independentTotal + amount,
    }));
  }, []);

  const runDraw = useCallback((): DrawRecord | null => {
    let record: DrawRecord | null = null;

    setState((s) => {
      const ticket = generateTicket(s.scores);

      if (!ticket || !s.subActive) return s;

      const result = drawRandomNumbers();
      const matches = ticket.filter((n) =>
        result.includes(n)
      ).length;

      const tier5 =
        BASE_POOL * 0.4 + s.jackpotRollover;

      const tier4 = BASE_POOL * 0.35;
      const tier3 = BASE_POOL * 0.25;

      let payout = 0;
      let tierLabel = "No match";
      let status: DrawRecord["status"] = "no_win";
      let jackpotRollover = s.jackpotRollover;

      if (matches >= 5) {
        payout = tier5;
        tierLabel = "5-number match — jackpot";
        status = "awaiting_proof";
        jackpotRollover = 0;
      } else if (matches === 4) {
        payout = tier4;
        tierLabel = "4-number match";
        status = "awaiting_proof";
        jackpotRollover += tier5;
      } else if (matches === 3) {
        payout = tier3;
        tierLabel = "3-number match";
        status = "awaiting_proof";
        jackpotRollover += tier5;
      } else {
        jackpotRollover += tier5;
      }

      record = {
        id: "d" + Date.now(),
        date: new Date().toISOString().slice(0, 10),
        ticket,
        result,
        matches,
        tierLabel,
        payout,
        status,
      };

      return {
        ...s,
        draws: [...s.draws, record],
        jackpotRollover,
      };
    });

    return record;
  }, []);

  const advanceDrawStatus = useCallback(
    (id: string, next: DrawRecord["status"]) => {
      setState((s) => ({
        ...s,
        draws: s.draws.map((d) =>
          d.id === id
            ? {
                ...d,
                status: next,
              }
            : d
        ),
      }));
    },
    []
  );

  return {
    state,
    hydrated,
    completeOnboarding,
    cancelSubscription,
    reopenSubscription,
    addScore,
    editScore,
    deleteScore,
    setCharity,
    setCharityPct,
    addDonation,
    runDraw,
    advanceDrawStatus,
  };
}
