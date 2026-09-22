"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// The 1–45 range and one-entry-per-date rule are enforced by CHECK/UNIQUE
// constraints in the DB (supabase/schema.sql) — these checks here are just
// for a fast, friendly error message before the round-trip.

export async function addScore(date: string, points: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  if (!Number.isInteger(points) || points < 1 || points > 45) {
    return { error: "Stableford points must be a whole number from 1 to 45." };
  }

  const { error } = await supabase.from("scores").insert({ user_id: user.id, score_date: date, points });
  if (error) {
    if (error.code === "23505") return { error: "You already logged a round for this date — edit it below instead." };
    return { error: error.message };
  }
  revalidatePath("/dashboard");
  return { error: null };
}

export async function editScore(scoreId: string, date: string, points: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  if (!Number.isInteger(points) || points < 1 || points > 45) {
    return { error: "Stableford points must be a whole number from 1 to 45." };
  }

  const { error } = await supabase.from("scores").update({ score_date: date, points }).eq("id", scoreId).eq("user_id", user.id);
  if (error) {
    if (error.code === "23505") return { error: "Another round is already logged for that date." };
    return { error: error.message };
  }
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deleteScore(scoreId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("scores").delete().eq("id", scoreId).eq("user_id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

// ---- admin-only (editing another user's scores) ----

export async function adminAddScore(userId: string, date: string, points: number) {
  const supabase = createClient();
  if (!Number.isInteger(points) || points < 1 || points > 45) {
    return { error: "Stableford points must be a whole number from 1 to 45." };
  }
  const { error } = await supabase.from("scores").insert({ user_id: userId, score_date: date, points });
  if (error) {
    if (error.code === "23505") return { error: "A round already exists for that date." };
    return { error: error.message };
  }
  revalidatePath("/admin");
  return { error: null };
}

export async function adminEditScore(scoreId: string, date: string, points: number) {
  const supabase = createClient();
  if (!Number.isInteger(points) || points < 1 || points > 45) {
    return { error: "Stableford points must be a whole number from 1 to 45." };
  }
  const { error } = await supabase.from("scores").update({ score_date: date, points }).eq("id", scoreId);
  if (error) {
    if (error.code === "23505") return { error: "Another round is already logged for that date." };
    return { error: error.message };
  }
  revalidatePath("/admin");
  return { error: null };
}

export async function adminDeleteScore(scoreId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("scores").delete().eq("id", scoreId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { error: null };
}
