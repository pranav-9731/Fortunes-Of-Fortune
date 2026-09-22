import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const [
    { data: profile },
    { data: scores },
    { data: charities },
    { data: winners },
    { data: donations },
    { data: draws },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("scores").select("*").eq("user_id", user.id),
    supabase.from("charities").select("*").order("name"),
    supabase.from("winners").select("*").eq("user_id", user.id),
    supabase.from("donations").select("amount").eq("user_id", user.id),
    supabase
      .from("draws")
      .select("*")
      .order("published_at", { ascending: false })
      .limit(5),
  ]);

  if (!profile) {
    redirect("/login?next=/dashboard");
  }

  const independentTotal = (donations ?? []).reduce(
    (sum, d) => sum + Number(d.amount),
    0
  );

  return (
    <DashboardClient
      profile={profile}
      scores={scores ?? []}
      charities={charities ?? []}
      winners={winners ?? []}
      draws={draws ?? []}
      independentTotal={independentTotal}
    />
  );
}