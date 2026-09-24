"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PLAN_PRICE, Plan } from "@/lib/types";
import {
  getRazorpayKeyId,
  getRazorpayPlanId,
  razorpayRequest,
  verifyRazorpaySubscriptionSignature,
} from "@/lib/razorpay";

type RazorpaySubscription = {
  id: string;
  status: string;
  current_start: number | null;
  current_end: number | null;
  plan_id: string;
  notes?: Record<string, string> | null;
};

function validatePlan(plan: Plan) {
  if (plan !== "monthly" && plan !== "yearly") {
    throw new Error("Invalid subscription plan.");
  }
}

async function getCurrentUser() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not signed in.");
  }

  return { supabase, user };
}

function getRenewDate(
  subscription: RazorpaySubscription,
  plan: Plan
) {
  if (subscription.current_end) {
    return new Date(subscription.current_end * 1000)
      .toISOString()
      .slice(0, 10);
  }

  const date = new Date();

  date.setMonth(
    date.getMonth() + (plan === "yearly" ? 12 : 1)
  );

  return date.toISOString().slice(0, 10);
}

export async function createCheckoutSession(
  plan: Plan,
  charityId: string,
  charityPct: number
) {
  try {
    validatePlan(plan);

    if (charityPct < 10 || charityPct > 100) {
      return {
        error: "Split must be between 10 and 100.",
      };
    }

    if (!charityId) {
      return {
        error: "Choose a charity before continuing.",
      };
    }

    const { supabase, user } = await getCurrentUser();

    const { data: charity, error: charityError } =
      await supabase
        .from("charities")
        .select("id")
        .eq("id", charityId)
        .single();

    if (charityError || !charity) {
      return {
        error: "The selected charity could not be found.",
      };
    }

    const planId = getRazorpayPlanId(plan);

    const subscription =
      await razorpayRequest<RazorpaySubscription>(
        "/subscriptions",
        {
          method: "POST",
          body: {
            plan_id: planId,
            total_count:
              plan === "monthly" ? 1200 : 100,
            quantity: 1,
            customer_notify: true,
            notes: {
              user_id: user.id,
              plan,
              charity_id: charityId,
              charity_pct: String(charityPct),
            },
          },
        }
      );

    if (!subscription?.id) {
      return {
        error:
          "Razorpay did not return a subscription ID.",
      };
    }

    const { error: profileError } =
      await supabase
        .from("profiles")
        .update({
          razorpay_subscription_id: subscription.id,
          plan,
          plan_price: PLAN_PRICE[plan],
          charity_id: charityId,
          charity_pct: charityPct,
        })
        .eq("id", user.id);

    if (profileError) {
      return {
        error: profileError.message,
      };
    }

    return {
      error: null,
      keyId: getRazorpayKeyId(),
      subscriptionId: subscription.id,
      name:
        user.user_metadata?.name ||
        "FortuneArc subscriber",
      email: user.email ?? "",
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not create the payment subscription.",
    };
  }
}

export async function verifyRazorpayPayment(
  paymentId: string,
  subscriptionId: string,
  signature: string
) {
  try {
    if (
      !paymentId ||
      !subscriptionId ||
      !signature
    ) {
      return {
        error:
          "Incomplete Razorpay payment response.",
      };
    }

    const { supabase, user } =
      await getCurrentUser();

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "razorpay_subscription_id, plan, charity_id, charity_pct"
      )
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return {
        error:
          profileError?.message ||
          "Profile not found.",
      };
    }

    if (
      profile.razorpay_subscription_id !==
      subscriptionId
    ) {
      return {
        error:
          "This payment belongs to a different subscription.",
      };
    }

    if (!profile.plan || !profile.charity_id) {
      return {
        error:
          "Subscription details are incomplete.",
      };
    }

    if (
      !verifyRazorpaySubscriptionSignature(
        paymentId,
        subscriptionId,
        signature
      )
    ) {
      return {
        error:
          "Invalid Razorpay payment signature.",
      };
    }

    const subscription =
      await razorpayRequest<RazorpaySubscription>(
        `/subscriptions/${encodeURIComponent(
          subscriptionId
        )}`
      );

    if (
      subscription.status !== "active" &&
      subscription.status !== "authenticated"
    ) {
      return {
        error:
          `Razorpay has not authorized this subscription yet. ` +
          `Current status: ${subscription.status}.`,
      };
    }

    const renewDate = getRenewDate(
      subscription,
      profile.plan
    );

    const { error } = await supabase
      .from("profiles")
      .update({
        onboarded: true,
        status: "active",
        renew_date: renewDate,
      })
      .eq("id", user.id);

    if (error) {
      return {
        error: error.message,
      };
    }

    revalidatePath("/dashboard");

    return {
      error: null,
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not verify the Razorpay payment.",
    };
  }
}