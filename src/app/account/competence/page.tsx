import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpLink } from "@/components/help/help-link";
import { PageShell } from "@/components/projects/page-shell";
import { CompetenceForm } from "@/components/tasks/competence-form";
import { requireAal2 } from "@/lib/auth/server";
import { loadStatement } from "@/lib/statements";

export const metadata = { title: "Competence passport · Dutyholder" };

export default function PassportPage() {
  return (
    <PageShell>
      <Passport />
    </PageShell>
  );
}

// Edit your competence statement outside any project. Saving creates a new
// version that every project you join can reuse.
async function Passport() {
  const { supabase, userId } = await requireAal2();
  const [{ data: draftRow }, { data: latestRow }] = await Promise.all([
    supabase.from("competence_statements").select("id").eq("user_id", userId).eq("status", "draft").maybeSingle(),
    supabase.from("competence_statements").select("id").eq("user_id", userId).eq("status", "submitted")
      .order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const [draft, latest] = await Promise.all([
    draftRow ? loadStatement(supabase, draftRow.id) : null,
    latestRow ? loadStatement(supabase, latestRow.id) : null,
  ]);

  return (
    <div className="space-y-4">
      <Link href="/account" className="inline-block text-sm text-muted-foreground hover:underline">← My details</Link>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-xl">Competence passport <HelpLink topic="competence" /></CardTitle>
          <CardDescription className="text-base">
            Skills, knowledge, experience and behaviours (reg 11F), with evidence. Firms should also describe their
            organisational capability. Keep it current here and reuse it on every project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompetenceForm mode="passport" projectId="" itemId="" userId={userId} isFirm isHigherRisk={false}
            draft={draft} latestSubmitted={latest} nextHref="/account" />
        </CardContent>
      </Card>
    </div>
  );
}
