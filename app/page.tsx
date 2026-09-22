import Link from "next/link";
import { createPublicClient } from "@/lib/supabase/server";
import { fmtINR } from "@/lib/ticket";

export default async function HomePage() {
  const supabase = createPublicClient();
  const { data } = await supabase.rpc("get_public_stats");
  const stats = data ?? { active_subscribers: 0, charities_count: 0, charity_funds_raised: 0, current_pool: 0 };

  return (
    <div className="relative z-[1]">
      <header className="sticky top-0 z-30 bg-[rgba(11,19,17,0.72)] backdrop-blur-md border-b border-hairline">
        <div className="max-w-[1180px] mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-display font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-coral shadow-[0_0_10px_#E05A47]" />
            digital.heroes
          </div>
          <Link
            href="/login?mode=signup"
            className="font-mono text-sm border-[1.5px] border-gold text-gold rounded px-5 py-2.5 hover:shadow-[3px_3px_0_#D4AF37] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
          >
            Start subscription
          </Link>
        </div>
      </header>

      <main className="max-w-[1180px] mx-auto px-8">
        <section className="grid md:grid-cols-[1.15fr_0.85fr] gap-10 items-end pt-24 pb-16">
          <div>
            <div className="font-mono text-sm text-muted mb-5 max-w-[360px]">
              Golf performance meets charitable stakes
              <br />— <span className="text-coral">every score you post moves real money.</span>
            </div>
            <h1 className="font-display font-semibold text-5xl md:text-6xl leading-[1.03]">
              Play your round.
              <br />
              <span className="text-gold-glow">Fund someone&rsquo;s fight.</span>
            </h1>
            <p className="mt-6 max-w-[440px] text-muted text-lg">
              Log your last five Stableford rounds, enter the monthly draw, and send a share of your subscription
              straight to a cause you picked.
            </p>
            <div className="mt-8 flex gap-4 flex-wrap">
              <Link href="/login?mode=signup" className="rounded bg-gold text-void font-semibold px-6 py-3.5 shadow-[5px_5px_0_rgba(212,175,55,0.28)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-transform">
                Start your subscription
              </Link>
              <a href="#how" className="rounded border-[1.5px] border-hairline px-5 py-3.5 hover:border-muted hover:text-gold-glow transition-colors">
                See how the draw works
              </a>
            </div>
          </div>

          <div className="rounded border border-hairline bg-surface backdrop-blur p-7 md:translate-x-7 md:translate-y-6">
            <div className="font-mono text-sm text-muted">Sent to charity partners, all time</div>
            <div className="font-mono text-4xl text-coral mt-2">{fmtINR(stats.charity_funds_raised)}</div>
            <div className="mt-3 text-sm text-dim">
              {stats.active_subscribers === 0
                ? "No subscribers yet — be the first."
                : `Funded by ${stats.active_subscribers} active subscriber${stats.active_subscribers === 1 ? "" : "s"}.`}
            </div>
          </div>
        </section>

        <section className="grid md:grid-cols-3 gap-6 py-9 border-y border-hairline">
          <Stat value={String(stats.active_subscribers)} label="Active subscribers right now" />
          <Stat value={fmtINR(stats.current_pool)} label="Current prize pool, three tiers" align="center" color="text-gold-glow" />
          <Stat value={String(stats.charities_count)} label="Charities in the directory" align="right" color="text-coral" />
        </section>

        <section id="how" className="py-20">
          <div className="max-w-lg mb-12">
            <div className="font-mono text-sm text-gold mb-2.5">how it works</div>
            <h2 className="font-display text-3xl">Three steps, one round of golf.</h2>
          </div>
          <div className="relative pl-0.5">
            <Step n={1} title="Subscribe monthly or yearly" desc="Pick a plan, set your charity split at signup — a minimum of 10%, more if you choose." meta="Monthly or yearly · cancel anytime" />
            <Step n={2} title="Log your last five rounds" desc="Stableford scores from 1–45, one per date. Post a sixth and the oldest quietly drops off — enforced by the database, not just the form." meta="Rolling 5-score matrix · reverse chronological" />
            <Step n={3} title="Enter the draw, fund your cause" desc="Match 3, 4 or 5 numbers and win a share of the pool — your charity gets its cut either way." meta="Published monthly by admin · simulated before results go live" />
          </div>
        </section>

        <section className="py-20 text-center md:text-left flex flex-col md:flex-row items-center md:items-center justify-between gap-6 border-t border-hairline">
          <div>
            <h2 className="font-display text-3xl max-w-lg">Your next round can fund someone else&rsquo;s.</h2>
            <p className="text-muted mt-2.5 max-w-md">Create an account, set your charity split, and log your first five scores.</p>
          </div>
          <Link href="/login?mode=signup" className="rounded bg-gold text-void font-semibold px-6 py-3.5 shadow-[5px_5px_0_rgba(212,175,55,0.28)] whitespace-nowrap">
            Start your subscription
          </Link>
        </section>
      </main>

      <footer className="border-t border-hairline py-7 text-center text-dim text-sm">
        © 2026 Digital Heroes · <Link href="/login" className="underline underline-offset-4 hover:text-gold-glow">Sign in</Link>
      </footer>
    </div>
  );
}

function Stat({ value, label, align = "left", color = "text-gold" }: { value: string; label: string; align?: "left" | "center" | "right"; color?: string }) {
  const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  return (
    <div className={alignClass}>
      <div className={`font-mono text-2xl ${color}`}>{value}</div>
      <div className="text-muted text-sm mt-1.5">{label}</div>
    </div>
  );
}

function Step({ n, title, desc, meta }: { n: number; title: string; desc: string; meta: string }) {
  return (
    <div className="grid grid-cols-[46px_1fr] gap-6 py-7 border-t border-[rgba(31,58,52,0.35)] first:border-t-0">
      <div className="w-[46px] h-[46px] rounded-full bg-gold text-void font-mono flex items-center justify-center text-sm">{n}</div>
      <div>
        <h3 className="font-display text-xl mb-2">{title}</h3>
        <p className="text-muted max-w-lg">{desc}</p>
        <span className="font-mono text-xs text-gold-glow mt-3 inline-block">{meta}</span>
      </div>
    </div>
  );
}
