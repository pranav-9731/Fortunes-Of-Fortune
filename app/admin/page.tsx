import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminClient from "./AdminClient";

export default async function AdminPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  const [
    { data: users },
    { data: scores },
    { data: charities },
    { data: draws },
    { data: winners },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .order("joined_date", { ascending: false }),

    supabase.from("scores").select("*"),

    supabase.from("charities").select("*").order("name"),

    supabase
      .from("draws")
      .select("*")
      .order("published_at", { ascending: false }),

    supabase
      .from("winners")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const lastRollover =
    draws && draws.length > 0
      ? Number(draws[0].jackpot_rollover_out)
      : 0;

  return (
    <AdminClient
      users={users ?? []}
      scoresByUser={groupScores(scores ?? [])}
      charities={charities ?? []}
      draws={draws ?? []}
      winners={winners ?? []}
      jackpotRollover={lastRollover}
    />
  );
}

function groupScores(scores: any[]) {
  const map: Record<string, any[]> = {};

  scores.forEach((s) => {
    (map[s.user_id] ??= []).push(s);
  });

  return map;
}