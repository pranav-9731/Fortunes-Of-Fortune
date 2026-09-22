"use client";

import { useState, useTransition } from "react";
import { Draw, Profile, Score, Winner } from "@/lib/types";
import { fmtINR } from "@/lib/ticket";
import { addDonation } from "@/app/actions/donations";

export default function Overview({
  profile,
  scores,
  draws,
  winners,
  independentTotal,
  onChanged,
}: {
  profile: Profile;
  scores: Score[];
  draws: Draw[];
  winners: Winner[];
  independentTotal: number;
  onChanged: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [isPending, startTransition] = useTransition();
  const sortedScores = [...scores].sort((a, b) => b.score_date.localeCompare(a.score_date));
  const totalWonPaid = winners.filter((w) => w.payout_status === "paid").reduce((a, w) => a + w.amount, 0);

  return (
    <section>
      <div className="max-w-lg mb-8">
        <div className="font-mono text-xs text-gold mb-2">this month</div>
        <h2 className="font-display text-2xl mb-2">Everything you&rsquo;re funding, at a glance.</h2>
        <p className="text-muted">Your subscription, your live score matrix, and where the money&rsquo;s actually going.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Tile label="Subscription" value={profile.status === "active" ? (profile.plan === "yearly" ? "Yearly" : "Monthly") : "Inactive"} />
        <Tile label="Charity split" value={profile.charity_id ? `${profile.charity_pct}%` : "—"} color="text-gold-glow" />
        <Tile label="Draws published" value={String(draws.length)} />
        <Tile label="Total won (paid)" value={fmtINR(totalWonPaid)} color="text-coral" />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="rounded border border-hairline bg-surface p-6">
          <div className="font-mono text-xs text-muted mb-4">Live score matrix</div>
          {sortedScores.length === 0 ? (
            <div className="text-dim text-sm py-4">Nothing logged yet.</div>
          ) : (
            sortedScores.slice(0, 5).map((s) => (
              <div key={s.id} className="flex justify-between border-b border-[rgba(31,58,52,0.4)] last:border-0 py-2.5 font-mono text-sm">
                <span className="text-dim">{s.score_date}</span>
                <span className="text-gold-glow">{s.points} pts</span>
              </div>
            ))
          )}
        </div>

        <div className="rounded border border-hairline bg-surface p-6">
          <div className="font-mono text-xs text-muted mb-3">Independent giving</div>
          <p className="text-muted text-sm mb-4">Give directly to your chosen charity, separate from your subscription split.</p>
          <div className="flex gap-3">
            <input
              type="number"
              placeholder="Amount (₹)"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 rounded bg-void border border-hairline px-3 py-2.5 font-mono text-sm"
            />
            <button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const n = Number(amount);
                  const res = await addDonation(n);
                  if (!res.error) {
                    setAmount("");
                    onChanged();
                  }
                })
              }
              className="rounded bg-gold text-void font-semibold px-5 disabled:opacity-50"
            >
              Give
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Tile({ label, value, color = "text-gold" }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded border border-hairline bg-surface p-4">
      <div className="font-mono text-xs text-muted">{label}</div>
      <div className={`font-mono text-xl mt-2 ${color}`}>{value}</div>
    </div>
  );
}
