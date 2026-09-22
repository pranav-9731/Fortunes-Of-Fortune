"use client";

import { Draw, Profile, Score, Winner } from "@/lib/types";
import { generateTicket, fmtINR } from "@/lib/ticket";

export default function DrawPanel({
  profile,
  scores,
  winners,
  draws,
}: {
  profile: Profile;
  scores: Score[];
  winners: Winner[];
  draws: Draw[];
}) {
  const ticket = generateTicket(scores);
  const latestDraw = draws[0];
  const myLatestWin = latestDraw ? winners.find((w) => w.draw_id === latestDraw.id) : undefined;

  return (
    <section>
      <div className="max-w-lg mb-8">
        <div className="font-mono text-xs text-gold mb-2">this month&rsquo;s stakes</div>
        <h2 className="font-display text-2xl mb-2">Your ticket, the pool, the odds.</h2>
        <p className="text-muted">
          Your five numbers are generated from your logged rounds. Admin publishes the draw monthly — once they do,
          your result shows up here automatically.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="rounded border border-hairline bg-surface p-6">
          <div className="font-mono text-xs text-muted mb-4">Your ticket for this month</div>
          <div className="flex gap-2.5 flex-wrap mb-5">
            {!ticket ? (
              <div className="text-dim text-sm">Log 5 rounds to generate this month&rsquo;s ticket.</div>
            ) : (
              ticket.map((n) => {
                const hit = latestDraw?.winning_numbers.includes(n);
                return (
                  <div
                    key={n}
                    className={`w-11 h-11 rounded-full border-[1.5px] flex items-center justify-center font-mono text-sm ${
                      hit ? "bg-coral border-coral text-void font-semibold" : "border-gold text-gold-glow"
                    }`}
                  >
                    {n}
                  </div>
                );
              })
            )}
          </div>
          {!profile.charity_id && <div className="text-dim text-sm">Subscribe and pick a charity to be entered in the draw.</div>}

          {latestDraw && (
            <div className="mt-4 pt-5 border-t border-hairline">
              <div className="font-mono text-xs text-dim mb-2">Latest draw · {latestDraw.month} · winning numbers: {latestDraw.winning_numbers.join(", ")}</div>
              {myLatestWin ? (
                <div className="font-display text-lg text-coral">
                  {myLatestWin.tier}-number match — {fmtINR(myLatestWin.amount)} · {myLatestWin.proof_status}
                </div>
              ) : ticket ? (
                <div className="text-muted text-sm">No match this month — your charity share still went out.</div>
              ) : null}
            </div>
          )}
        </div>

        <div className="rounded border border-hairline bg-surface p-6">
          <div className="font-mono text-xs text-muted mb-4">Prize pool distribution</div>
          <Tier label="5-number match" pct={40} color="bg-coral" />
          <Tier label="4-number match" pct={35} color="bg-gold" />
          <Tier label="3-number match" pct={25} color="bg-gold-glow" />
          <div className="font-mono text-xs text-dim mt-2">
            Unclaimed 5-match jackpots roll into next month&rsquo;s pool automatically.
          </div>
        </div>
      </div>
    </section>
  );
}

function Tier({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1.5">
        <span>{label}</span>
        <span className="font-mono text-gold">{pct}%</span>
      </div>
      <div className="h-2 rounded bg-[rgba(147,166,158,0.12)] overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
