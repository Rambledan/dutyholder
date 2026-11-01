import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageShell } from "@/components/projects/page-shell";
import { ProjectSetupForm } from "@/components/projects/project-setup-form";
import { requireAal2 } from "@/lib/auth/server";
import { updateProject } from "../../actions";

export const metadata = { title: "Edit project · Dutyholder" };

export default async function EditProjectPage(props: PageProps<"/projects/[id]/edit">) {
  return (
    <PageShell back={{ href: ".", label: "Back to project" }}>
      <EditProject params={props.params} />
    </PageShell>
  );
}

async function EditProject({ params }: { params: PageProps<"/projects/[id]/edit">["params"] }) {
  const { supabase } = await requireAal2();
  const { id } = await params;

  const [{ data: project }, { data: isOwner }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase.rpc("is_project_owner", { p_project_id: id }),
  ]);
  if (!project || !isOwner) notFound();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit project set-up</CardTitle>
        <CardDescription>
          Changing these answers updates everyone&apos;s checklist. Items that no longer apply are withdrawn, not
          deleted.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProjectSetupForm
          action={updateProject.bind(null, id)}
          submitLabel="Save changes"
          initial={{
            name: project.name,
            address: project.address,
            description: project.description,
            isDomesticClient: project.is_domestic_client,
            domesticDutiesToPd: project.domestic_duties_to_pd,
            expectedContractors: project.expected_contractors,
            cdmPdCertified: project.cdm_pd_certified,
          }}
        />
      </CardContent>
    </Card>
  );
}
