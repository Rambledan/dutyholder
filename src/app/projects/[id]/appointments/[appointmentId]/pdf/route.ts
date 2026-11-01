import { createElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { people } from "@/lib/appointments";
import { partyLabel } from "@/lib/letters";
import { AppointmentPdf } from "@/lib/pdf/appointment-pdf";
import { createClient } from "@/lib/supabase/server";

const fmt = (d: string) =>
  new Date(d).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/London" });

// The PDF is rebuilt from the frozen letter and the recorded signatures each
// time, so it always matches the database. Access goes through RLS.
export async function GET(_req: Request, ctx: RouteContext<"/projects/[id]/appointments/[appointmentId]/pdf">) {
  const { id: projectId, appointmentId } = await ctx.params;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (claims?.claims?.aal !== "aal2") return new Response("Two-factor verification required", { status: 401 });

  const [{ data: a }, { data: signatories }, { data: signatures }, { data: project }] = await Promise.all([
    supabase.from("appointments").select("*").eq("id", appointmentId).eq("project_id", projectId).maybeSingle(),
    supabase.from("appointment_signatories")
      .select("member_id, party, project_members(id, user_id, email, display_name, role, is_firm)")
      .eq("appointment_id", appointmentId),
    supabase.from("appointment_signatures")
      .select("member_id, party, typed_name, signed_at, ip_address")
      .eq("appointment_id", appointmentId),
    supabase.from("projects").select("is_domestic_client").eq("id", projectId).maybeSingle(),
  ]);
  if (!a) return new Response("Not found", { status: 404 });

  const names = await people(supabase, (signatories ?? []).map((s) => s.project_members!).filter(Boolean));
  const doc = createElement(AppointmentPdf, {
    title: a.letter_title,
    text: a.letter_text,
    sha256: a.letter_sha256,
    templateVersion: a.template_version,
    appointmentId: a.id,
    status: a.status,
    voidReason: a.void_reason,
    generatedAt: fmt(new Date().toISOString()),
    signatures: (signatories ?? []).map((s) => {
      const g = signatures?.find((x) => x.member_id === s.member_id && x.party === s.party);
      return {
        name: names.get(s.member_id)?.name ?? "",
        party: partyLabel(s.party, Boolean(project?.is_domestic_client)),
        typedName: g?.typed_name ?? null,
        signedAt: g ? fmt(g.signed_at) : null,
        ip: (g?.ip_address as string | null) ?? null,
      };
    }),
  }) as unknown as ReactElement<DocumentProps>;

  const pdf = await renderToBuffer(doc);
  const filename = `${a.kind.replace(/_/g, "-")}-${a.id.slice(0, 8)}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
