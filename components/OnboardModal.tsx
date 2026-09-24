"use client";

import { useState, useTransition } from "react";
import { Charity, Plan } from "@/lib/types";
import {
  createCheckoutSession,
  verifyRazorpayPayment,
} from "@/app/actions/payments";

declare global {
  interface Window {
    Razorpay?: new (
      options: RazorpayCheckoutOptions
    ) => RazorpayCheckout;
  }
}

type RazorpayCheckoutResponse = {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
};

type RazorpayPaymentFailedResponse = {
  error?: {
    code?: string;
    description?: string;
    reason?: string;
    source?: string;
    step?: string;
    metadata?: {
      order_id?: string;
      payment_id?: string;
    };
  };
};

type RazorpayCheckoutOptions = {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill?: {
    name?: string;
    email?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler: (
    response: RazorpayCheckoutResponse
  ) => void | Promise<void>;
};

type RazorpayCheckout = {
  open: () => void;
  on: (
    event: string,
    callback: (
      response: RazorpayPaymentFailedResponse
    ) => void
  ) => void;
};

const PLANS: {
  plan: Plan;
  label: string;
  sub: string;
  price: string;
}[] = [
  {
    plan: "monthly",
    label: "Monthly",
    sub: "Cancel anytime",
    price: "₹499/mo",
  },
  {
    plan: "yearly",
    label: "Yearly",
    sub: "Two months free",
    price: "₹4,999/yr",
  },
];

function loadRazorpayCheckout() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", () =>
        resolve(Boolean(window.Razorpay))
      );
      existingScript.addEventListener("error", () =>
        resolve(false)
      );
      return;
    }

    const script = document.createElement("script");

    script.src =
      "https://checkout.razorpay.com/v1/checkout.js";

    script.async = true;

    script.onload = () =>
      resolve(Boolean(window.Razorpay));

    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

export default function OnboardModal({
  charities,
  onChanged,
  onClose,
}: {
  charities: Charity[];
  onChanged: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [charityId, setCharityId] = useState<string | null>(
    null
  );
  const [pct, setPct] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(6,10,9,0.82)] backdrop-blur-sm p-5">
      <div className="w-full max-w-lg rounded bg-surface-solid border border-hairline p-8 max-h-[88vh] overflow-y-auto">
        {step === 1 && (
          <>
            <div className="font-mono text-xs text-muted mb-2">
              step 1 of 2
            </div>

            <h2 className="font-display text-2xl mb-4">
              Pick your plan.
            </h2>

            {PLANS.map((p) => (
              <button
                key={p.plan}
                onClick={() => setPlan(p.plan)}
                className={`w-full flex items-center justify-between rounded border p-4 mb-3 text-left transition-colors ${
                  plan === p.plan
                    ? "border-gold bg-gold/5"
                    : "border-hairline hover:border-muted"
                }`}
              >
                <div>
                  <div className="font-semibold">
                    {p.label}
                  </div>

                  <div className="text-muted text-sm">
                    {p.sub}
                  </div>
                </div>

                <div className="font-mono text-gold">
                  {p.price}
                </div>
              </button>
            ))}

            <div className="flex justify-between mt-6">
              <button
                onClick={onClose}
                className="rounded border border-hairline px-5 py-3 text-sm"
              >
                Back
              </button>

              <button
                disabled={!plan}
                onClick={() => setStep(2)}
                className="rounded bg-gold text-void font-semibold px-6 py-3 disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="font-mono text-xs text-muted mb-2">
              step 2 of 2
            </div>

            <h2 className="font-display text-2xl mb-4">
              Choose your charity.
            </h2>

            {charities.length === 0 ? (
              <div className="text-dim text-sm mb-6">
                No charities are listed yet — an admin needs to
                add at least one before you can subscribe.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {charities.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCharityId(c.id)}
                    className={`text-left rounded border p-4 transition-colors ${
                      charityId === c.id
                        ? "border-coral bg-coral/5"
                        : "border-hairline hover:border-muted"
                    }`}
                  >
                    <div className="font-semibold text-sm mb-1">
                      {c.name}
                    </div>

                    <div className="text-muted text-xs">
                      {c.blurb}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="font-mono text-xs text-muted mb-2">
              Split of your subscription
            </div>

            <div className="flex items-center gap-4 mb-6">
              <input
                type="range"
                min={10}
                max={100}
                value={pct}
                onChange={(e) =>
                  setPct(Number(e.target.value))
                }
                className="flex-1"
              />

              <div className="font-mono text-coral min-w-[50px] text-right">
                {pct}%
              </div>
            </div>

            {error && (
              <div className="font-mono text-coral text-sm mb-4 whitespace-pre-wrap">
                {error}
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                disabled={isPending}
                className="rounded border border-hairline px-5 py-3 text-sm disabled:opacity-50"
              >
                Back
              </button>

              <button
                disabled={
                  !charityId ||
                  !plan ||
                  isPending
                }
                onClick={() =>
                  startTransition(async () => {
                    if (!plan || !charityId) {
                      return;
                    }

                    setError(null);

                    const res =
                      await createCheckoutSession(
                        plan,
                        charityId,
                        pct
                      );

                    if (res.error) {
                      setError(res.error);
                      return;
                    }

                    if (
                      !res.keyId ||
                      !res.subscriptionId
                    ) {
                      setError(
                        "Payment checkout could not be opened."
                      );
                      return;
                    }

                    const loaded =
                      await loadRazorpayCheckout();

                    if (
                      !loaded ||
                      !window.Razorpay
                    ) {
                      setError(
                        "Razorpay Checkout could not be loaded."
                      );
                      return;
                    }

                    const checkout =
                      new window.Razorpay({
                        key: res.keyId,
                        subscription_id:
                          res.subscriptionId,
                        name: "FortuneArc",
                        description:
                          plan === "monthly"
                            ? "FortuneArc Monthly Subscription"
                            : "FortuneArc Yearly Subscription",
                        prefill: {
                          name: res.name,
                          email: res.email,
                        },
                        theme: {
                          color: "#d9ad5b",
                        },
                        handler: async (
                          response
                        ) => {
                          const verification =
                            await verifyRazorpayPayment(
                              response.razorpay_payment_id,
                              response.razorpay_subscription_id,
                              response.razorpay_signature
                            );

                          if (
                            verification.error
                          ) {
                            setError(
                              verification.error
                            );
                            return;
                          }

                          onChanged();

                          window.location.assign(
                            "/dashboard?payment=success"
                          );
                        },
                      });

                    checkout.on(
                      "payment.failed",
                      (response) => {
                        const paymentError =
                          response.error;

                        const details = [
                          paymentError?.description,
                          paymentError?.reason
                            ? `Reason: ${paymentError.reason}`
                            : null,
                          paymentError?.code
                            ? `Code: ${paymentError.code}`
                            : null,
                          paymentError?.source
                            ? `Source: ${paymentError.source}`
                            : null,
                          paymentError?.step
                            ? `Step: ${paymentError.step}`
                            : null,
                        ].filter(Boolean);

                        setError(
                          details.length > 0
                            ? details.join("\n")
                            : "The Razorpay payment failed."
                        );
                      }
                    );

                    checkout.open();
                  })
                }
                className="rounded bg-gold text-void font-semibold px-6 py-3 disabled:opacity-40"
              >
                {isPending
                  ? "Opening payment…"
                  : "Continue to payment"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}