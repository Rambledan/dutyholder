import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/projects/page-shell";
import { ProjectSetupForm } from "@/components/projects/project-setup-form";
import { requireAal2 } from "@/lib/auth/server";
import { createProject } from "../actions";

export const metadata = { title: "New project · Dutyholder" };

export default function NewProjectPage() {
  return (
    <PageShell back={{ href: "/", label: "Projects" }}>
      <NewProject />
    </PageShell>
  );
}

async function NewProject() {
  await requireAal2();
  return (
    <Card>
      <CardHeader>
        <CardTitle>New project</CardTitle>
        <CardDescription>
          These answers decide which duties each person gets. You can change them later and the checklists
          update automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProjectSetupForm action={createProject} askOwnerRole submitLabel="Create project" />
      </CardContent>
    </Card>
  );
}
