"use client";

import { useState, useTransition } from "react";
import { Draw, DrawMode, DrawTierSnapshot, Profile } from "@/lib/types";
import { fmtINR } from "@/lib/ticket";
import { publishDraw, runSimulation } from "@/app/actions/draws";
import { Head } from "./UserManagement";

export default function DrawManagement({
  users,
  draws,
  totalPool,
  jackpotRollover,
  onChanged,
}: {
  users: Profile[];
  draws: Draw[];
  totalPool: number;
  jackpotRollover: number;
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<DrawMode>("random");
  const [preview, setPreview] = useState<{ winningNumbers: number[]; tiers: DrawTierSnapshot[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const nameFor = (id: string) => users.find((u) => u.id === id)?.name || users.find((u) => u.id === id)?.email || id;

  return (
    <section>
      <Head tag="draw management" title="Configure, simulate, publish." desc="Nothing pays out until you publish — simulate first to preview the tier breakdown against the live subscriber base, computed fresh from the database." />

      <div className="grid lg:grid-cols-2 gap-5 mb-10">
        <div className="rounded border border-hairline bg-surface p-6">
          <div className="font-mono text-xs text-muted mb-4">Draw logic</div>
          <div className="flex gap-2 mb-5">
            {(["random", "algorithmic"] as DrawMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setPreview(null); }}
                className={`rounded border px-4 py-2 text-sm font-mono ${mode === m ? "border-gold text-gold" : "border-hairline text-muted"}`}
              >
                {m === "random" ? "Random" : "Algorithmic (weighted)"}
              </button>
            ))}
          </div>
          <div className="text-muted text-sm mb-5">
            {mode === "algorithmic"
              ? "Weighted toward numbers that appear most often across active subscribers' generated tickets."
              : "Standard lottery-style — every number has an equal chance."}
          </div>
          <div className="font-mono text-xs text-dim mb-5">
            Pool this run: {fmtINR(totalPool)} · Rollover carried in: {fmtINR(jackpotRollover)}
          </div>
          {error && <div className="font-mono text-coral text-sm mb-4">{error}</div>}
          <div className="flex gap-3">
            <button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const res = await runSimulation(mode);
                  if (res.error) { setError(res.error); return; }
                  setPreview({ winningNumbers: res.winningNumbers!, tiers: res.tiers! });
                })
              }
              className="rounded border-[1.5px] border-gold text-gold px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
            >
              {isPending ? "Working…" : "Run simulation"}
            </button>
            <button
              disabled={!preview || isPending}
              onClick={() =>
                startTransition(async () => {
                  if (!preview) return;
                  const res = await publishDraw(mode, preview.winningNumbers);
                  if (res.error) { setError(res.error); return; }
                  setPreview(null);
                  onChanged();
                })
              }
              className="rounded bg-gold text-void px-5 py-2.5 text-sm font-semibold disabled:opacity-40"
            >
              Publish results
            </button>
          </div>
        </div>

        <div className="rounded border border-hairline bg-surface p-6">
          <div className="font-mono text-xs text-muted mb-4">Simulation preview</div>
          {!preview ? (
            <div className="text-dim text-sm">Run a simulation to preview this month&rsquo;s winning numbers and tier breakdown.</div>
          ) : (
            <>
              <div className="flex gap-2 mb-5 flex-wrap">
                {preview.winningNumbers.map((n) => (
                  <div key={n} className="w-10 h-10 rounded-full border-[1.5px] border-gold flex items-center justify-center font-mono text-sm text-gold-glow">{n}</div>
                ))}
              </div>
              {preview.tiers.map((t) => (
                <div key={t.tier} className="flex justify-between text-sm py-1.5 border-b border-[rgba(31,58,52,0.3)] last:border-0">
                  <span>{t.tier}-match ({t.winner_ids.length} winner{t.winner_ids.length === 1 ? "" : "s"})</span>
                  <span className="font-mono text-gold-glow">{t.winner_ids.length ? fmtINR(t.amount_each) + " each" : "—"}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <div className="font-mono text-xs text-muted mb-3">Draw history</div>
      <div className="rounded border border-hairline bg-surface overflow-hidden">
        {draws.length === 0 ? (
          <div className="p-5 text-dim text-sm">No draws published yet.</div>
        ) : (
          draws.map((d) => (
            <div key={d.id} className="px-5 py-4 border-b border-[rgba(31,58,52,0.4)] last:border-0">
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-sm">{d.month} · {d.mode}</span>
                <span className="font-mono text-xs text-dim">{fmtINR(d.total_pool)} pool</span>
              </div>
              <div className="flex gap-2 mb-2 flex-wrap">
                {d.winning_numbers.map((n) => (
                  <span key={n} className="w-7 h-7 rounded-full border border-hairline flex items-center justify-center font-mono text-xs text-muted">{n}</span>
                ))}
              </div>
              <div className="text-xs text-dim font-mono">
                {d.tiers.map((t) => `${t.tier}-match: ${t.winner_ids.map(nameFor).join(", ") || "none"}`).join(" · ")}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
