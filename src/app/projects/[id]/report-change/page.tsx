import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/projects/page-shell";
import { ReportChangeForm } from "@/components/review/report-change-form";
import { requireAal2 } from "@/lib/auth/server";

export const metadata = { title: "Report a change · Dutyholder" };

export default function ReportChangePage(props: PageProps<"/projects/[id]/report-change">) {
  return (
    <PageShell>
      <ReportChange params={props.params} />
    </PageShell>
  );
}

async function ReportChange({ params }: { params: PageProps<"/projects/[id]/report-change">["params"] }) {
  await requireAal2();
  const { id } = await params;
  if (!id) notFound();
  return (
    <div className="space-y-4">
      <Link href={`/projects/${id}/tasks`} className="inline-block text-sm text-muted-foreground hover:underline">← Your tasks</Link>
      <Card>
        <CardHeader>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Reg 11I</p>
          <CardTitle className="text-xl">Report a change in your competence</CardTitle>
          <CardDescription className="text-base">
            If you no longer meet the competence requirements for your work on this project, the law asks you to tell
            whoever appointed you. This tells the project owner, records the report, and sends your competence
            statement back for review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReportChangeForm projectId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
