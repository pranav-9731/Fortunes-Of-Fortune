"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { generateTicket } from "@/lib/ticket";
import { DrawMode, DrawTierSnapshot, POOL_FUNDING_RATE, Profile, Score } from "@/lib/types";

function drawRandom(): number[] {
  const nums = new Set<number>();
  while (nums.size < 5) nums.add(1 + Math.floor(Math.random() * 49));
  return Array.from(nums).sort((a, b) => a - b);
}

function drawWeighted(ticketsByUser: Map<string, number[]>): number[] {
  const freq = new Array(50).fill(0);
  ticketsByUser.forEach((ticket) => ticket.forEach((n) => (freq[n] += 1)));
  const bag: number[] = [];
  for (let n = 1; n <= 49; n++) {
    const weight = freq[n] + 1; // every number keeps a baseline chance
    for (let i = 0; i < weight; i++) bag.push(n);
  }
  const picked = new Set<number>();
  let guard = 0;
  while (picked.size < 5 && guard < 5000) {
    picked.add(bag[Math.floor(Math.random() * bag.length)]);
    guard++;
  }
  while (picked.size < 5) picked.add(1 + Math.floor(Math.random() * 49));
  return Array.from(picked).sort((a, b) => a - b);
}

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." as const, supabase: null, user: null };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return { error: "Admins only." as const, supabase: null, user: null };
  return { error: null, supabase, user };
}

async function loadActiveTickets(supabase: ReturnType<typeof createClient>) {
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id,name,plan_price,status")
    .eq("status", "active");
  const active = (profiles ?? []) as Pick<Profile, "id" | "name" | "plan_price" | "status">[];
  if (active.length === 0) return { active, ticketsByUser: new Map<string, number[]>() };

  const ids = active.map((p) => p.id);
  const { data: scores } = await supabase.from("scores").select("user_id,score_date,points").in("user_id", ids);
  const byUser = new Map<string, Score[]>();
  (scores ?? []).forEach((s: any) => {
    const list = byUser.get(s.user_id) ?? [];
    list.push(s);
    byUser.set(s.user_id, list);
  });

  const ticketsByUser = new Map<string, number[]>();
  active.forEach((p) => {
    const ticket = generateTicket(byUser.get(p.id) ?? []);
    if (ticket) ticketsByUser.set(p.id, ticket);
  });
  return { active, ticketsByUser };
}

async function lastRollover(supabase: ReturnType<typeof createClient>) {
  const { data } = await supabase.from("draws").select("jackpot_rollover_out").order("published_at", { ascending: false }).limit(1);
  return data && data.length > 0 ? Number(data[0].jackpot_rollover_out) : 0;
}

function computeTiers(active: Pick<Profile, "id" | "plan_price">[], ticketsByUser: Map<string, number[]>, winningNumbers: number[], rollover: number) {
  const totalPool = active.reduce((sum, p) => sum + p.plan_price * POOL_FUNDING_RATE, 0);
  const tier5Pool = totalPool * 0.4 + rollover;
  const tier4Pool = totalPool * 0.35;
  const tier3Pool = totalPool * 0.25;
  const byTier: Record<3 | 4 | 5, string[]> = { 3: [], 4: [], 5: [] };

  ticketsByUser.forEach((ticket, userId) => {
    const matches = ticket.filter((n) => winningNumbers.includes(n)).length;
    if (matches === 5) byTier[5].push(userId);
    else if (matches === 4) byTier[4].push(userId);
    else if (matches === 3) byTier[3].push(userId);
  });

  const tiers: DrawTierSnapshot[] = [
    { tier: 5, pool_share: tier5Pool, winner_ids: byTier[5], amount_each: byTier[5].length ? tier5Pool / byTier[5].length : 0 },
    { tier: 4, pool_share: tier4Pool, winner_ids: byTier[4], amount_each: byTier[4].length ? tier4Pool / byTier[4].length : 0 },
    { tier: 3, pool_share: tier3Pool, winner_ids: byTier[3], amount_each: byTier[3].length ? tier3Pool / byTier[3].length : 0 },
  ];
  return { tiers, totalPool };
}

export async function runSimulation(mode: DrawMode) {
  const gate = await requireAdmin();
  if (gate.error || !gate.supabase) return { error: gate.error };
  const supabase = gate.supabase;

  const { active, ticketsByUser } = await loadActiveTickets(supabase);
  const rollover = await lastRollover(supabase);
  const winningNumbers = mode === "random" ? drawRandom() : drawWeighted(ticketsByUser);
  const { tiers, totalPool } = computeTiers(active, ticketsByUser, winningNumbers, rollover);

  return { error: null, winningNumbers, tiers, totalPool, jackpotRolloverIn: rollover };
}

export async function publishDraw(mode: DrawMode, winningNumbers: number[]) {
  const gate = await requireAdmin();
  if (gate.error || !gate.supabase) return { error: gate.error };
  const supabase = gate.supabase;

  const { active, ticketsByUser } = await loadActiveTickets(supabase);
  const rollover = await lastRollover(supabase);
  const { tiers, totalPool } = computeTiers(active, ticketsByUser, winningNumbers, rollover);
  const jackpotRolloverOut = tiers.find((t) => t.tier === 5)!.winner_ids.length > 0 ? 0 : tiers.find((t) => t.tier === 5)!.pool_share;

  const month = new Date().toISOString().slice(0, 7);
  const { data: draw, error: drawError } = await supabase
    .from("draws")
    .insert({
      month,
      mode,
      winning_numbers: winningNumbers,
      total_pool: totalPool,
      jackpot_rollover_in: rollover,
      jackpot_rollover_out: jackpotRolloverOut,
      tiers,
    })
    .select()
    .single();

  if (drawError || !draw) return { error: drawError?.message ?? "Could not publish draw." };

  const winnerRows = tiers.flatMap((t) =>
    t.winner_ids.map((userId) => ({
      draw_id: draw.id,
      user_id: userId,
      tier: t.tier,
      matches: t.tier,
      amount: t.amount_each,
    }))
  );

  if (winnerRows.length > 0) {
    const { error: winnersError } = await supabase.from("winners").insert(winnerRows);
    if (winnersError) return { error: winnersError.message };
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { error: null };
}
