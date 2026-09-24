"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { razorpayRequest } from "@/lib/razorpay";
import { SubStatus } from "@/lib/types";

export async function cancelSubscription() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("razorpay_subscription_id")
    .eq("id", user.id)
    .single();

  if (profileError) return { error: profileError.message };

  if (profile?.razorpay_subscription_id) {
    try {
      await razorpayRequest(
        `/subscriptions/${encodeURIComponent(
          profile.razorpay_subscription_id
        )}/cancel`,
        {
          method: "POST",
          body: {
            cancel_at_cycle_end: 0,
          },
        }
      );
    } catch (error) {
      return {
        error:
          error instanceof Error
            ? error.message
            : "Razorpay could not cancel the subscription.",
      };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      status: "cancelled",
      razorpay_subscription_id: null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

export async function reopenOnboarding() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ onboarded: false })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

export async function setCharity(charityId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ charity_id: charityId })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

export async function setCharityPct(pct: number) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };
  if (pct < 10 || pct > 100) {
    return { error: "Split must be between 10 and 100." };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ charity_pct: pct })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { error: null };
}

// ---- admin-only ----

export async function adminEditProfile(
  userId: string,
  fields: { name?: string; email?: string }
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update(fields)
    .eq("id", userId);

  // RLS + trg_protect_profile_fields enforce that only an admin session can
  // reach this row for someone else — this check just gives a clean message.
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { error: null };
}

export async function adminSetStatus(userId: string, status: SubStatus) {
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", userId);

  if (error) return { error: error.message };
  revalidatePath("/admin");
  return { error: null };
}
