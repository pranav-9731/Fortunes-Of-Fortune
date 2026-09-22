"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Charity, Draw, POOL_FUNDING_RATE, Profile, Score, Winner } from "@/lib/types";
import UserManagement from "@/components/admin/UserManagement";
import DrawManagement from "@/components/admin/DrawManagement";
import CharityManagement from "@/components/admin/CharityManagement";
import WinnersManagement from "@/components/admin/WinnersManagement";
import ReportsAnalytics from "@/components/admin/ReportsAnalytics";
import { addCharity, deleteCharity, editCharity } from "@/app/actions/charities";

const SECTIONS = [
  { id: "users", label: "User management" },
  { id: "draws", label: "Draw management" },
  { id: "charities", label: "Charity management" },
  { id: "winners", label: "Winners management" },
  { id: "reports", label: "Reports & analytics" },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

export default function AdminClient({
  users,
  scoresByUser,
  charities,
  draws,
  winners,
  jackpotRollover,
}: {
  users: Profile[];
  scoresByUser: Record<string, Score[]>;
  charities: Charity[];
  draws: Draw[];
  winners: Winner[];
  jackpotRollover: number;
}) {
  const [section, setSection] = useState<SectionId>("users");
  const [, startTransition] = useTransition();
  const router = useRouter();
  const refresh = () => startTransition(() => router.refresh());

  const activeUsers = users.filter((u) => u.status === "active");
  const totalPool = activeUsers.reduce((sum, u) => sum + u.plan_price * POOL_FUNDING_RATE, 0);

  return (
    <div className="min-h-screen relative z-[1] md:flex">
      <aside className="md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-hairline bg-surface-solid/40">
        <div className="px-6 py-5 flex items-center gap-2.5 font-display font-bold border-b border-hairline">
          <span className="w-2.5 h-2.5 rounded-full bg-gold shadow-[0_0_10px_#D4AF37]" />
          Admin console
        </div>
        <nav className="p-3 flex md:flex-col gap-1 overflow-x-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`text-left text-sm px-4 py-2.5 rounded whitespace-nowrap ${
                section === s.id ? "bg-surface text-gold border border-hairline" : "text-muted hover:text-ink border border-transparent"
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>
        <div className="p-4 hidden md:block">
          <Link href="/dashboard" className="text-xs text-dim underline underline-offset-4 hover:text-gold-glow">
            ← back to subscriber app
          </Link>
        </div>
      </aside>

      <main className="flex-1 px-6 md:px-10 py-10 max-w-[1180px]">
        {section === "users" && <UserManagement users={users} scoresByUser={scoresByUser} charities={charities} onChanged={refresh} />}
        {section === "draws" && <DrawManagement users={users} draws={draws} totalPool={totalPool} jackpotRollover={jackpotRollover} onChanged={refresh} />}
        {section === "charities" && (
          <CharityManagement
            charities={charities}
            onAdd={async (c) => { await addCharity(c); refresh(); }}
            onEdit={async (id, f) => { await editCharity(id, f); refresh(); }}
            onDelete={async (id) => { await deleteCharity(id); refresh(); }}
          />
        )}
        {section === "winners" && <WinnersManagement winners={winners} users={users} onChanged={refresh} />}
        {section === "reports" && (
          <ReportsAnalytics users={users} draws={draws} winners={winners} charities={charities} totalPool={totalPool} jackpotRollover={jackpotRollover} />
        )}
      </main>
    </div>
  );
}
