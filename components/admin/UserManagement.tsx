"use client";

import { useState, useTransition } from "react";
import { Charity, Profile, Score, SubStatus } from "@/lib/types";
import { fmtINR } from "@/lib/ticket";
import { adminEditProfile, adminSetStatus } from "@/app/actions/profile";
import { adminAddScore, adminDeleteScore, adminEditScore } from "@/app/actions/scores";

const STATUS_STYLE: Record<SubStatus, string> = {
  active: "text-gold-glow border-gold-glow/40",
  lapsed: "text-coral border-coral/40",
  cancelled: "text-dim border-hairline",
  inactive: "text-dim border-hairline",
};

export default function UserManagement({
  users,
  scoresByUser,
  charities,
  onChanged,
}: {
  users: Profile[];
  scoresByUser: Record<string, Score[]>;
  charities: Charity[];
  onChanged: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <section>
      <Head tag="user management" title="Every subscriber, one place." desc="View and edit profiles, adjust subscriptions, and correct a user's logged scores directly — every write here goes through Postgres RLS, same as the subscriber app." />

      <div className="rounded border border-hairline bg-surface overflow-hidden">
        <div className="grid grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto] gap-3 px-5 py-3 font-mono text-xs text-muted border-b border-hairline">
          <span>Subscriber</span><span>Plan</span><span>Status</span><span>Charity</span><span></span>
        </div>
        {users.length === 0 && <div className="p-6 text-dim text-sm">No subscribers have signed up yet.</div>}
        {users.map((u) => {
          const charity = charities.find((c) => c.id === u.charity_id);
          return (
            <div key={u.id} className="border-b border-[rgba(31,58,52,0.4)] last:border-0">
              <div className="grid grid-cols-[1.4fr_1fr_0.8fr_0.8fr_auto] gap-3 px-5 py-3.5 items-center text-sm">
                <div>
                  <div className="font-medium">{u.name || "(no name set)"}</div>
                  <div className="text-dim text-xs font-mono">{u.email}</div>
                </div>
                <span className="font-mono text-xs">{u.plan ?? "—"}</span>
                <span className={`font-mono text-xs px-2 py-1 rounded-full border w-fit ${STATUS_STYLE[u.status]}`}>{u.status}</span>
                <span className="text-xs text-muted">{charity ? `${charity.name.split(" ")[0]} · ${u.charity_pct}%` : "—"}</span>
                <button
                  onClick={() => setOpenId(openId === u.id ? null : u.id)}
                  className="justify-self-end rounded border border-hairline px-3 py-1.5 text-xs font-mono hover:text-gold-glow hover:border-gold-glow"
                >
                  {openId === u.id ? "Close" : "Manage"}
                </button>
              </div>
              {openId === u.id && (
                <UserDetail user={u} scores={scoresByUser[u.id] ?? []} onChanged={onChanged} />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function UserDetail({ user, scores, onChanged }: { user: Profile; scores: Score[]; onChanged: () => void }) {
  const [name, setName] = useState(user.name);
  const [date, setDate] = useState("");
  const [points, setPoints] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const sorted = [...scores].sort((a, b) => b.score_date.localeCompare(a.score_date));

  return (
    <div className="bg-void/60 px-5 py-5 grid md:grid-cols-2 gap-6">
      <div>
        <div className="font-mono text-xs text-muted mb-3">Profile & subscription</div>
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => startTransition(async () => { await adminEditProfile(user.id, { name }); onChanged(); })}
            className="w-full rounded bg-void border border-hairline px-3 py-2 text-sm"
          />
          <div className="font-mono text-xs text-dim">{user.email}</div>
          <div className="flex gap-2">
            {(["active", "lapsed", "cancelled"] as SubStatus[]).map((s) => (
              <button
                key={s}
                disabled={isPending}
                onClick={() => startTransition(async () => { await adminSetStatus(user.id, s); onChanged(); })}
                className={`rounded border px-3 py-1.5 text-xs font-mono ${user.status === s ? "border-gold text-gold" : "border-hairline text-muted"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="font-mono text-xs text-dim">Joined {user.joined_date} · {fmtINR(user.plan_price)}/{user.plan === "yearly" ? "yr" : "mo"}</div>
        </div>
      </div>

      <div>
        <div className="font-mono text-xs text-muted mb-3">Score matrix (rolling 5, DB-enforced)</div>
        {sorted.length === 0 && <div className="text-dim text-sm mb-3">No rounds logged.</div>}
        {sorted.map((s) => (
          <ScoreRow
            key={s.id}
            score={s}
            onSave={(d, p) => startTransition(async () => { const r = await adminEditScore(s.id, d, p); if (!r.error) onChanged(); })}
            onDelete={() => startTransition(async () => { await adminDeleteScore(s.id); onChanged(); })}
          />
        ))}
        <div className="flex gap-2 mt-3">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded bg-void border border-hairline px-2 py-2 text-xs font-mono" />
          <input type="number" min={1} max={45} placeholder="pts" value={points} onChange={(e) => setPoints(e.target.value)} className="w-20 rounded bg-void border border-hairline px-2 py-2 text-xs font-mono" />
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const p = Number(points);
                if (!date || !p || p < 1 || p > 45) { setError("Date + points (1–45) required."); return; }
                const res = await adminAddScore(user.id, date, p);
                if (res.error) { setError(res.error); return; }
                setError(null); setDate(""); setPoints(""); onChanged();
              })
            }
            className="rounded border border-hairline px-3 py-1.5 text-xs font-mono hover:text-gold-glow hover:border-gold-glow"
          >
            Add
          </button>
        </div>
        {error && <div className="text-coral text-xs font-mono mt-2">{error}</div>}
      </div>
    </div>
  );
}

function ScoreRow({ score, onSave, onDelete }: { score: Score; onSave: (d: string, p: number) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(score.score_date);
  const [points, setPoints] = useState(String(score.points));

  if (editing) {
    return (
      <div className="flex gap-2 items-center py-1.5">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded bg-void border border-hairline px-2 py-1.5 text-xs font-mono" />
        <input type="number" min={1} max={45} value={points} onChange={(e) => setPoints(e.target.value)} className="w-16 rounded bg-void border border-hairline px-2 py-1.5 text-xs font-mono" />
        <button onClick={() => { onSave(date, Number(points)); setEditing(false); }} className="text-xs font-mono text-gold-glow">Save</button>
        <button onClick={() => setEditing(false)} className="text-xs font-mono text-dim">Cancel</button>
      </div>
    );
  }
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-[rgba(31,58,52,0.3)] last:border-0 text-sm font-mono">
      <span className="text-dim">{score.score_date}</span>
      <span className="text-gold-glow">{score.points} pts</span>
      <span className="flex gap-2">
        <button onClick={() => setEditing(true)} className="text-xs text-muted hover:text-gold-glow">edit</button>
        <button onClick={onDelete} className="text-xs text-muted hover:text-coral">delete</button>
      </span>
    </div>
  );
}

export function Head({ tag, title, desc }: { tag: string; title: string; desc: string }) {
  return (
    <div className="max-w-xl mb-8">
      <div className="font-mono text-xs text-gold mb-2">{tag}</div>
      <h2 className="font-display text-2xl mb-2">{title}</h2>
      <p className="text-muted">{desc}</p>
    </div>
  );
}
