"use client";

import { useState, useTransition } from "react";
import { Winner } from "@/lib/types";
import { fmtINR } from "@/lib/ticket";
import { submitProof } from "@/app/actions/winners";

const STATUS_LABEL: Record<Winner["proof_status"], string> = {
  awaiting: "Awaiting proof",
  submitted: "Submitted — pending review",
  approved: "Approved — payout pending",
  rejected: "Proof rejected",
};

export default function WinningsPanel({ winners, onChanged }: { winners: Winner[]; onChanged: () => void }) {
  const sorted = [...winners].reverse();
  const [proofDraft, setProofDraft] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  return (
    <section>
      <div className="max-w-lg mb-8">
        <div className="font-mono text-xs text-gold mb-2">payout tracking</div>
        <h2 className="font-display text-2xl mb-2">Every draw you&rsquo;ve won.</h2>
        <p className="text-muted">Submit proof for a win and it moves to admin review, then to a completed payout.</p>
      </div>

      <div className="rounded border border-hairline bg-surface p-6">
        {sorted.length === 0 ? (
          <div className="text-dim text-sm py-4">No wins yet — once admin publishes a draw you match on, it&rsquo;ll show up here.</div>
        ) : (
          sorted.map((w) => (
            <div key={w.id} className="py-4 border-b border-[rgba(31,58,52,0.4)] last:border-0">
              <div className="flex justify-between items-center text-sm mb-2">
                <span>{w.tier}-number match</span>
                <span className="font-mono text-gold-glow">{fmtINR(w.amount)}</span>
                <span
                  className={`font-mono text-xs px-2.5 py-1 rounded-full border ${
                    w.payout_status === "paid"
                      ? "text-gold-glow border-gold-glow/40"
                      : w.proof_status === "rejected"
                      ? "text-coral border-coral/40"
                      : "text-muted border-hairline"
                  }`}
                >
                  {w.payout_status === "paid" ? "Paid" : STATUS_LABEL[w.proof_status]}
                </span>
              </div>
              {w.proof_status === "awaiting" && (
                <div className="flex gap-2 mt-2">
                  <input
                    placeholder="Link to your score screenshot"
                    value={proofDraft[w.id] ?? ""}
                    onChange={(e) => setProofDraft((d) => ({ ...d, [w.id]: e.target.value }))}
                    className="flex-1 rounded bg-void border border-hairline px-3 py-2 text-xs font-mono"
                  />
                  <button
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const url = proofDraft[w.id];
                        if (!url) return;
                        const res = await submitProof(w.id, url);
                        if (!res.error) onChanged();
                      })
                    }
                    className="rounded border border-hairline px-3 py-2 text-xs font-mono hover:text-gold-glow hover:border-gold-glow whitespace-nowrap"
                  >
                    Submit proof
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
