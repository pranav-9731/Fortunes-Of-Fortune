"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addDonation(amount: number) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  if (!amount || amount <= 0) return { error: "Enter an amount greater than zero." };

  const { error } = await supabase.from("donations").insert({ user_id: user.id, amount });
  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}
