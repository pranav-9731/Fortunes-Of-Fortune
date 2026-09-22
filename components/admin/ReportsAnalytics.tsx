"use client";

import { Charity, Draw, Profile, Winner } from "@/lib/types";
import { fmtINR } from "@/lib/ticket";
import { Head } from "./UserManagement";

export default function ReportsAnalytics({
  users,
  draws,
  winners,
  charities,
  totalPool,
  jackpotRollover,
}: {
  users: Profile[];
  draws: Draw[];
  winners: Winner[];
  charities: Charity[];
  totalPool: number;
  jackpotRollover: number;
}) {
  const activeUsers = users.filter((u) => u.status === "active");
  const totalPaid = winners.filter((w) => w.payout_status === "paid").reduce((a, w) => a + w.amount, 0);

  const charityTotals = charities.map((c) => {
    const subs = activeUsers.filter((u) => u.charity_id === c.id);
    const total = subs.reduce((sum, u) => sum + (u.plan_price * u.charity_pct) / 100, 0);
    return { charity: c, total, subscriberCount: subs.length };
  });

  const tierCounts = { 3: 0, 4: 0, 5: 0 } as Record<3 | 4 | 5, number>;
  winners.forEach((w) => (tierCounts[w.tier] += 1));

  return (
    <section>
      <Head tag="reports & analytics" title="The numbers behind the platform." desc="Computed live from the current user base, published draws, and the winner queue — not cached or precomputed." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Tile label="Total users" value={String(users.length)} />
        <Tile label="Active subscribers" value={String(activeUsers.length)} color="text-gold-glow" />
        <Tile label="Total prize pool" value={fmtINR(totalPool)} />
        <Tile label="Jackpot rollover" value={fmtINR(jackpotRollover)} color="text-coral" />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="rounded border border-hairline bg-surface p-6">
          <div className="font-mono text-xs text-muted mb-4">Charity contribution totals (active subscribers)</div>
          {charities.length === 0 && <div className="text-dim text-sm">No charities listed yet.</div>}
          {charityTotals.map(({ charity, total, subscriberCount }) => (
            <div key={charity.id} className="flex justify-between items-center py-2 border-b border-[rgba(31,58,52,0.3)] last:border-0 text-sm">
              <span>{charity.name} <span className="text-dim text-xs">({subscriberCount})</span></span>
              <span className="font-mono text-gold-glow">{fmtINR(total)}</span>
            </div>
          ))}
        </div>

        <div className="rounded border border-hairline bg-surface p-6">
          <div className="font-mono text-xs text-muted mb-4">Draw statistics</div>
          <Row label="Draws published" value={String(draws.length)} />
          <Row label="5-number winners (all time)" value={String(tierCounts[5])} />
          <Row label="4-number winners (all time)" value={String(tierCounts[4])} />
          <Row label="3-number winners (all time)" value={String(tierCounts[3])} />
          <Row label="Total paid out" value={fmtINR(totalPaid)} />
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
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-[rgba(31,58,52,0.3)] last:border-0 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-mono text-gold-glow">{value}</span>
    </div>
  );
}
