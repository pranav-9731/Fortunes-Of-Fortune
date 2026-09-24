import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { PLAN_PRICE, Plan } from "@/lib/types";
import {
  verifyRazorpayWebhookSignature,
} from "@/lib/razorpay";

type RazorpaySubscription = {
  id: string;
  status: string;
  current_end: number | null;
  plan_id: string;
  notes?: Record<string, string> | null;
};

type RazorpayEvent = {
  event: string;
  payload?: {
    subscription?: {
      entity?: RazorpaySubscription;
    };
  };
};

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase server credentials are not configured.");
  }

  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function syncSubscription(subscription: RazorpaySubscription) {
  const notes = subscription.notes ?? {};
  const userId = notes.user_id;
  const plan = notes.plan as Plan | undefined;
  const charityId = notes.charity_id;
  const charityPct = Number(notes.charity_pct);

  if (!userId || !plan || !charityId || !Number.isInteger(charityPct)) {
    throw new Error("Razorpay subscription metadata is incomplete.");
  }

  if (plan !== "monthly" && plan !== "yearly") {
    throw new Error("Razorpay subscription contains an invalid plan.");
  }

  if (charityPct < 10 || charityPct > 100) {
    throw new Error("Razorpay subscription contains an invalid charity split.");
  }

  const supabase = getAdminSupabase();

  const { data: charity, error: charityError } = await supabase
    .from("charities")
    .select("id")
    .eq("id", charityId)
    .single();

  if (charityError || !charity) {
    throw new Error("Razorpay subscription references an unknown charity.");
  }

  const renewDate = subscription.current_end
    ? new Date(subscription.current_end * 1000).toISOString().slice(0, 10)
    : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      onboarded: true,
      status: "active",
      plan,
      plan_price: PLAN_PRICE[plan],
      renew_date: renewDate,
      razorpay_subscription_id: subscription.id,
      charity_id: charityId,
      charity_pct: charityPct,
    })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

async function syncSubscriptionStatus(subscription: RazorpaySubscription) {
  const supabase = getAdminSupabase();
  const status = subscription.status;

  if (status === "cancelled" || status === "expired" || status === "completed") {
    await supabase
      .from("profiles")
      .update({
        status: "cancelled",
        razorpay_subscription_id: null,
      })
      .eq("razorpay_subscription_id", subscription.id);
    return;
  }

  if (status === "halted") {
    await supabase
      .from("profiles")
      .update({ status: "lapsed" })
      .eq("razorpay_subscription_id", subscription.id);
  }
}

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Razorpay webhook signature." },
      { status: 400 }
    );
  }

  try {
    if (!verifyRazorpayWebhookSignature(payload, signature)) {
      return NextResponse.json(
        { error: "Invalid Razorpay webhook signature." },
        { status: 400 }
      );
    }

    const event = JSON.parse(payload) as RazorpayEvent;
    const subscription = event.payload?.subscription?.entity;

    if (!subscription) {
      return NextResponse.json({ received: true });
    }

    if (
      event.event === "subscription.authenticated" ||
      event.event === "subscription.activated" ||
      event.event === "subscription.charged"
    ) {
      await syncSubscription(subscription);
    }

    if (
      event.event === "subscription.cancelled" ||
      event.event === "subscription.completed" ||
      event.event === "subscription.halted"
    ) {
      await syncSubscriptionStatus(subscription);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Razorpay webhook processing failed.",
      },
      { status: 500 }
    );
  }
}
