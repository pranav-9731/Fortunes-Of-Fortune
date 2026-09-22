"use client";

import { useState, useTransition } from "react";
import { Charity, Plan } from "@/lib/types";
import { startSubscription } from "@/app/actions/profile";

const PLANS: { plan: Plan; label: string; sub: string; price: string }[] = [
  { plan: "monthly", label: "Monthly", sub: "Cancel anytime", price: "₹499/mo" },
  { plan: "yearly", label: "Yearly", sub: "Two months free", price: "₹4,999/yr" },
];

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
  const [charityId, setCharityId] = useState<string | null>(null);
  const [pct, setPct] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(6,10,9,0.82)] backdrop-blur-sm p-5">
      <div className="w-full max-w-lg rounded bg-surface-solid border border-hairline p-8 max-h-[88vh] overflow-y-auto">
        {step === 1 && (
          <>
            <div className="font-mono text-xs text-muted mb-2">step 1 of 2</div>
            <h2 className="font-display text-2xl mb-4">Pick your plan.</h2>

            {PLANS.map((p) => (
              <button
                key={p.plan}
                onClick={() => setPlan(p.plan)}
                className={`w-full flex items-center justify-between rounded border p-4 mb-3 text-left transition-colors ${
                  plan === p.plan ? "border-gold bg-gold/5" : "border-hairline hover:border-muted"
                }`}
              >
                <div>
                  <div className="font-semibold">{p.label}</div>
                  <div className="text-muted text-sm">{p.sub}</div>
                </div>
                <div className="font-mono text-gold">{p.price}</div>
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
            <div className="font-mono text-xs text-muted mb-2">step 2 of 2</div>
            <h2 className="font-display text-2xl mb-4">Choose your charity.</h2>

            {charities.length === 0 ? (
              <div className="text-dim text-sm mb-6">
                No charities are listed yet — an admin needs to add at least one before you can subscribe.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {charities.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCharityId(c.id)}
                    className={`text-left rounded border p-4 transition-colors ${
                      charityId === c.id ? "border-coral bg-coral/5" : "border-hairline hover:border-muted"
                    }`}
                  >
                    <div className="font-semibold text-sm mb-1">{c.name}</div>
                    <div className="text-muted text-xs">{c.blurb}</div>
                  </button>
                ))}
              </div>
            )}

            <div className="font-mono text-xs text-muted mb-2">Split of your subscription</div>

            <div className="flex items-center gap-4 mb-6">
              <input
                type="range"
                min={10}
                max={100}
                value={pct}
                onChange={(e) => setPct(Number(e.target.value))}
                className="flex-1"
              />
              <div className="font-mono text-coral min-w-[50px] text-right">{pct}%</div>
            </div>

            {error && <div className="font-mono text-coral text-sm mb-4">{error}</div>}

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="rounded border border-hairline px-5 py-3 text-sm"
              >
                Back
              </button>

              <button
                disabled={!charityId || isPending}
                onClick={() =>
                  startTransition(async () => {
                    if (!plan || !charityId) return;
                    const res = await startSubscription(plan, charityId, pct);
                    if (res.error) setError(res.error);
                    else onChanged();
                  })
                }
                className="rounded bg-gold text-void font-semibold px-6 py-3 disabled:opacity-40"
              >
                {isPending ? "Starting…" : "Start subscription"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}