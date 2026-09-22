"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// A subscriber may only move their OWN winner row from 'awaiting' to
// 'submitted', and only set proof_url — trg_protect_winner_fields in
// supabase/schema.sql rejects anything else at the database level even if
// this action's own checks were bypassed.
export async function submitProof(winnerId: string, proofUrl: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  if (!proofUrl.trim()) return { error: "Add a link or reference to your proof first." };

  const { error } = await supabase
    .from("winners")
    .update({ proof_url: proofUrl, proof_status: "submitted" })
    .eq("id", winnerId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

export async function reviewProof(winnerId: string, decision: "approved" | "rejected") {
  const supabase = createClient();
  const { error } = await supabase.from("winners").update({ proof_status: decision }).eq("id", winnerId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { error: null };
}

export async function markPaid(winnerId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("winners").update({ payout_status: "paid" }).eq("id", winnerId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { error: null };
}
