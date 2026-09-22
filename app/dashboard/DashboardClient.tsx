"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Charity, Draw, Profile, Score, Winner } from "@/lib/types";
import { signOut } from "@/app/actions/auth";
import { cancelSubscription, reopenOnboarding } from "@/app/actions/profile";
import OnboardModal from "@/components/OnboardModal";
import Overview from "@/components/Overview";
import ScoresPanel from "@/components/ScoresPanel";
import DrawPanel from "@/components/DrawPanel";
import CharityPanel from "@/components/CharityPanel";
import WinningsPanel from "@/components/WinningsPanel";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "scores", label: "Scores" },
  { id: "draw", label: "Draw" },
  { id: "charity", label: "Charity" },
  { id: "winnings", label: "Winnings" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function DashboardClient({
  profile,
  scores,
  charities,
  winners,
  draws,
  independentTotal,
}: {
  profile: Profile;
  scores: Score[];
  charities: Charity[];
  winners: Winner[];
  draws: Draw[];
  independentTotal: number;
}) {
  const [tab, setTab] = useState<TabId>("overview");
  const [isPending, startTransition] = useTransition();
  const [showOnboarding, setShowOnboarding] = useState(
    !profile.onboarded
  );

  const router = useRouter();

  function refresh() {
    startTransition(() => router.refresh());
  }

  function openOnboarding() {
    setShowOnboarding(true);
  }

  return (
    <div className="min-h-screen relative z-[1]">
      <header className="sticky top-0 z-30 bg-[rgba(11,19,17,0.82)] backdrop-blur-md border-b border-hairline">
        <div className="max-w-[1080px] mx-auto px-7 py-4.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5 font-display font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-coral shadow-[0_0_10px_#E05A47]" />
            digital.heroes
          </div>

          <nav className="flex gap-1 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`text-sm px-3.5 py-2 rounded transition-colors ${
                  tab === t.id
                    ? "text-gold border border-hairline bg-surface"
                    : "text-muted border border-transparent hover:text-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span
              className={`font-mono text-xs px-3 py-1.5 rounded-full border ${
                profile.status === "active"
                  ? "text-gold-glow border-gold-glow/40"
                  : "text-dim border-hairline"
              }`}
            >
              {profile.status === "active"
                ? `Active · renews ${profile.renew_date}`
                : "Not subscribed"}
            </span>

            <button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  if (profile.status === "active") {
                    if (
                      confirm(
                        "Cancel your subscription? Your history stays saved."
                      )
                    ) {
                      await cancelSubscription();
                      router.refresh();
                    }
                  } else {
                    await reopenOnboarding();
                    setShowOnboarding(true);
                    router.refresh();
                  }
                })
              }
              className="text-sm text-muted underline underline-offset-4 hover:text-coral disabled:opacity-50"
            >
              {profile.status === "active"
                ? "Cancel subscription"
                : "Start subscription"}
            </button>

            <form action={signOut}>
              <button className="text-sm text-dim hover:text-coral">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-[1080px] mx-auto px-7 py-11">
        {tab === "overview" && (
          <Overview
            profile={profile}
            scores={scores}
            draws={draws}
            winners={winners}
            independentTotal={independentTotal}
            onChanged={refresh}
          />
        )}

        {tab === "scores" && (
          <ScoresPanel
            scores={scores}
            onChanged={refresh}
          />
        )}

        {tab === "draw" && (
          <DrawPanel
            profile={profile}
            scores={scores}
            winners={winners}
            draws={draws}
          />
        )}

        {tab === "charity" && (
          <CharityPanel
            profile={profile}
            charities={charities}
            onChanged={refresh}
          />
        )}

        {tab === "winnings" && (
          <WinningsPanel
            winners={winners}
            onChanged={refresh}
          />
        )}
      </main>

      <footer className="border-t border-hairline text-center text-dim text-sm py-6">
        Digital Heroes · your data lives in Postgres, protected by row-level security
        {" · "}
        <a
          href="/admin"
          className="underline underline-offset-4 hover:text-gold-glow"
        >
          Admin console
        </a>
      </footer>

      {!profile.onboarded && showOnboarding && (
        <OnboardModal
          charities={charities}
          onChanged={refresh}
          onClose={() => setShowOnboarding(false)}
        />
      )}
    </div>
  );
}