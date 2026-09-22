"use client";

import { useTransition } from "react";
import { Profile, Winner } from "@/lib/types";
import { fmtINR } from "@/lib/ticket";
import { markPaid, reviewProof } from "@/app/actions/winners";
import { Head } from "./UserManagement";

const PROOF_LABEL: Record<Winner["proof_status"], string> = {
  awaiting: "Awaiting proof from subscriber",
  submitted: "Submitted — needs review",
  approved: "Approved",
  rejected: "Rejected",
};

export default function WinnersManagement({ winners, users, onChanged }: { winners: Winner[]; users: Profile[]; onChanged: () => void }) {
  const [isPending, startTransition] = useTransition();
  const nameFor = (id: string) => users.find((u) => u.id === id)?.name || users.find((u) => u.id === id)?.email || id;

  return (
    <section>
      <Head
        tag="winners management"
        title="Verify, then pay."
        desc="Eligibility applies to winners only. A subscriber submits proof from their own dashboard — you approve or reject it, then mark the payout complete. Nothing here pays automatically."
      />

      <div className="rounded border border-hairline bg-surface overflow-hidden">
        {winners.length === 0 ? (
          <div className="p-6 text-dim text-sm">No winners yet — publish a draw with at least one 3+ match to populate this queue.</div>
        ) : (
          winners.map((w) => (
            <div key={w.id} className="grid md:grid-cols-[1fr_100px_120px_1fr_160px] gap-3 items-center px-5 py-4 border-b border-[rgba(31,58,52,0.4)] last:border-0 text-sm">
              <div>
                <div className="font-medium">{nameFor(w.user_id)}</div>
                {w.proof_url && (
                  <a href={w.proof_url} target="_blank" rel="noreferrer" className="font-mono text-xs text-gold-glow underline underline-offset-2">
                    view proof
                  </a>
                )}
              </div>
              <span className="font-mono text-xs">{w.tier}-match</span>
              <span className="font-mono text-gold-glow">{fmtINR(w.amount)}</span>
              <span className="font-mono text-xs text-muted">{PROOF_LABEL[w.proof_status]}</span>
              <div className="flex gap-2 justify-start md:justify-end flex-wrap">
                {w.proof_status === "submitted" && (
                  <>
                    <button disabled={isPending} onClick={() => startTransition(async () => { await reviewProof(w.id, "approved"); onChanged(); })} className="rounded border border-hairline px-2.5 py-1 text-xs font-mono hover:text-gold-glow hover:border-gold-glow">
                      Approve
                    </button>
                    <button disabled={isPending} onClick={() => startTransition(async () => { await reviewProof(w.id, "rejected"); onChanged(); })} className="rounded border border-hairline px-2.5 py-1 text-xs font-mono hover:text-coral hover:border-coral">
                      Reject
                    </button>
                  </>
                )}
                {w.proof_status === "approved" && w.payout_status === "pending" && (
                  <button disabled={isPending} onClick={() => startTransition(async () => { await markPaid(w.id); onChanged(); })} className="rounded border border-hairline px-2.5 py-1 text-xs font-mono hover:text-gold-glow hover:border-gold-glow">
                    Mark payout complete
                  </button>
                )}
                {w.payout_status === "paid" && <span className="font-mono text-xs text-gold-glow">Paid</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
