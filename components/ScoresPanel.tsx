"use client";

import { useState, useTransition } from "react";
import { Score } from "@/lib/types";
import { addScore, deleteScore, editScore } from "@/app/actions/scores";

export default function ScoresPanel({ scores, onChanged }: { scores: Score[]; onChanged: () => void }) {
  const [date, setDate] = useState("");
  const [points, setPoints] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editPoints, setEditPoints] = useState("");
  const [isPending, startTransition] = useTransition();

  const sorted = [...scores].sort((a, b) => b.score_date.localeCompare(a.score_date));

  function submitAdd() {
    setError(null);
    const pts = Number(points);
    if (!date) return setError("Pick a date first.");
    if (!pts || pts < 1 || pts > 45 || !Number.isInteger(pts)) {
      return setError("Stableford points must be a whole number from 1 to 45.");
    }
    startTransition(async () => {
      const res = await addScore(date, pts);
      if (res.error) return setError(res.error);
      setDate("");
      setPoints("");
      onChanged();
    });
  }

  function submitEdit(id: string) {
    const pts = Number(editPoints);
    if (!editDate || !pts || pts < 1 || pts > 45) {
      alert("Points must be a whole number 1–45.");
      return;
    }
    startTransition(async () => {
      const res = await editScore(id, editDate, pts);
      if (res.error) { alert(res.error); return; }
      setEditingId(null);
      onChanged();
    });
  }

  return (
    <section>
      <div className="max-w-lg mb-8">
        <div className="font-mono text-xs text-gold mb-2">5-score rolling matrix</div>
        <h2 className="font-display text-2xl mb-2">Log your rounds.</h2>
        <p className="text-muted">
          Stableford points, 1–45. Only your latest five rounds ever count — the database keeps exactly five per
          subscriber; a sixth round drops the oldest date automatically.
        </p>
      </div>

      <div className="rounded border border-hairline bg-surface p-6">
        {sorted.length === 0 ? (
          <div className="text-dim text-sm py-4">No rounds logged yet — add your first below.</div>
        ) : (
          sorted.map((s) =>
            editingId === s.id ? (
              <div key={s.id} className="grid grid-cols-[1fr_90px_auto] gap-3 items-center py-3 border-b border-[rgba(31,58,52,0.4)] last:border-0">
                <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="rounded bg-void border border-hairline px-2 py-2 font-mono text-sm" />
                <input type="number" min={1} max={45} value={editPoints} onChange={(e) => setEditPoints(e.target.value)} className="rounded bg-void border border-hairline px-2 py-2 font-mono text-sm" />
                <div className="flex gap-2 justify-end">
                  <button disabled={isPending} onClick={() => submitEdit(s.id)} className="rounded border border-hairline px-3 py-1.5 text-xs font-mono">Save</button>
                  <button onClick={() => setEditingId(null)} className="rounded border border-hairline px-3 py-1.5 text-xs font-mono hover:text-coral hover:border-coral">Cancel</button>
                </div>
              </div>
            ) : (
              <div key={s.id} className="grid grid-cols-[1fr_90px_auto] gap-3 items-center py-3 border-b border-[rgba(31,58,52,0.4)] last:border-0">
                <span className="font-mono text-sm text-dim">{s.score_date}</span>
                <span className="font-mono text-sm text-gold-glow text-right font-medium">{s.points} pts</span>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setEditingId(s.id); setEditDate(s.score_date); setEditPoints(String(s.points)); }}
                    className="rounded border border-hairline px-3 py-1.5 text-xs font-mono hover:text-gold-glow hover:border-gold-glow"
                  >
                    Edit
                  </button>
                  <button
                    disabled={isPending}
                    onClick={() => confirm("Delete this round?") && startTransition(async () => { await deleteScore(s.id); onChanged(); })}
                    className="rounded border border-hairline px-3 py-1.5 text-xs font-mono hover:text-coral hover:border-coral"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          )
        )}

        <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 mt-5 items-end">
          <div>
            <label className="block font-mono text-xs text-muted mb-1.5">Date played</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded bg-void border border-hairline px-3 py-2.5 font-mono text-sm" />
          </div>
          <div>
            <label className="block font-mono text-xs text-muted mb-1.5">Stableford points (1–45)</label>
            <input type="number" min={1} max={45} value={points} onChange={(e) => setPoints(e.target.value)} className="w-full rounded bg-void border border-hairline px-3 py-2.5 font-mono text-sm" />
          </div>
          <button disabled={isPending} onClick={submitAdd} className="rounded bg-gold text-void font-semibold px-6 py-2.5 whitespace-nowrap disabled:opacity-50">
            {isPending ? "Saving…" : "Log round"}
          </button>
        </div>
        {error && <div className="font-mono text-coral text-sm mt-3">{error}</div>}
      </div>
    </section>
  );
}
