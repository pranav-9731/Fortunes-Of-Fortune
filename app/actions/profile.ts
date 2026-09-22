"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { Plan, PLAN_PRICE, SubStatus } from "@/lib/types";

export async function startSubscription(plan: Plan, charityId: string, charityPct: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const renew = new Date();
  renew.setMonth(renew.getMonth() + (plan === "yearly" ? 12 : 1));

  const { error } = await supabase
    .from("profiles")
    .update({
      onboarded: true,
      status: "active",
      plan,
      plan_price: PLAN_PRICE[plan],
      renew_date: renew.toISOString().slice(0, 10),
      charity_id: charityId,
      charity_pct: charityPct,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

export async function cancelSubscription() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("profiles").update({ status: "cancelled" }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

export async function reopenOnboarding() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("profiles").update({ onboarded: false }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

export async function setCharity(charityId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase.from("profiles").update({ charity_id: charityId }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

export async function setCharityPct(pct: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  if (pct < 10 || pct > 100) return { error: "Split must be between 10 and 100." };

  const { error } = await supabase.from("profiles").update({ charity_pct: pct }).eq("id", user.id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

// ---- admin-only ----

export async function adminEditProfile(userId: string, fields: { name?: string; email?: string }) {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").update(fields).eq("id", userId);
  // RLS + trg_protect_profile_fields enforce that only an admin session can
  // reach this row for someone else — this check just gives a clean message.
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { error: null };
}

export async function adminSetStatus(userId: string, status: SubStatus) {
  const supabase = createClient();
  const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { error: null };
}
