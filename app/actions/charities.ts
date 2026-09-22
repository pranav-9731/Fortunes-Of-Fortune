"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Admin-only in effect: RLS's charities_write policy rejects these writes
// outright for a non-admin session, regardless of what the UI allows.

export async function addCharity(fields: { name: string; blurb: string; media_note: string; event: string }) {
  const supabase = createClient();
  const { error } = await supabase.from("charities").insert(fields);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function editCharity(id: string, fields: Partial<{ name: string; blurb: string; media_note: string; event: string }>) {
  const supabase = createClient();
  const { error } = await supabase.from("charities").update(fields).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { error: null };
}

export async function deleteCharity(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("charities").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { error: null };
}
