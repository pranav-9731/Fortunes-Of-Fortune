"use client";

import { useState, useTransition } from "react";
import { Charity, Profile } from "@/lib/types";
import { fmtINR } from "@/lib/ticket";
import { setCharity, setCharityPct } from "@/app/actions/profile";

export default function CharityPanel({ profile, charities, onChanged }: { profile: Profile; charities: Charity[]; onChanged: () => void }) {
  const [pct, setPct] = useState(profile.charity_pct);
  const [isPending, startTransition] = useTransition();
  const amt = (profile.plan_price * pct) / 100;

  return (
    <section>
      <div className="max-w-lg mb-8">
        <div className="font-mono text-xs text-gold mb-2">give back</div>
        <h2 className="font-display text-2xl mb-2">You choose who gets funded.</h2>
        <p className="text-muted">Pick a charity and set your split — a minimum of 10% of your subscription, raised whenever you like.</p>
      </div>

      <div className="rounded border border-hairline bg-surface p-6">
        {charities.length === 0 ? (
          <div className="text-dim text-sm mb-4">No charities listed yet — check back once an admin has added some.</div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3.5 mb-7">
            {charities.map((c) => (
              <button
                key={c.id}
                onClick={() => startTransition(async () => { await setCharity(c.id); onChanged(); })}
                disabled={isPending}
                className={`text-left rounded border p-4 transition-colors ${
                  profile.charity_id === c.id ? "border-coral bg-coral/5" : "border-hairline bg-void hover:border-muted"
                }`}
              >
                <div className="font-semibold text-sm mb-1">{c.name}</div>
                <div className="text-muted text-xs">{c.blurb}</div>
              </button>
            ))}
          </div>
        )}

        <div className="font-mono text-xs text-muted mb-2">Your split of subscription</div>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={10}
            max={100}
            value={pct}
            onChange={(e) => setPct(Number(e.target.value))}
            onMouseUp={() => startTransition(async () => { await setCharityPct(pct); onChanged(); })}
            onTouchEnd={() => startTransition(async () => { await setCharityPct(pct); onChanged(); })}
            className="flex-1"
          />
          <div className="font-mono text-coral min-w-[150px] text-right">
            {pct}% · {fmtINR(amt)}/{profile.plan === "yearly" ? "yr" : "mo"}
          </div>
        </div>
      </div>
    </section>
  );
}
