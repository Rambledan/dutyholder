// Turns a project's records into the evidence pack's files, in the folder
// structure from PLAN.md. No database access: give it PackData, get back
// file paths and bytes, a manifest with SHA-256 fingerprints, and warnings.

import { createHash } from "node:crypto";
import { createElement, type ReactElement } from "react";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { RecordPdf, hashLines, pathLines, type Section } from "@/lib/pdf/record-pdf";
import { csvCell, toCsv } from "./csv";
import type { PackData, PackMember, PackStatement } from "./types";

const ROLE: Record<string, string> = {
  client: "Client", principal_designer: "Principal designer", designer: "Designer",
  principal_contractor: "Principal contractor", contractor: "Contractor",
};
const KIND: Record<string, string> = {
  pd_appointment: "Principal designer appointment", pc_appointment: "Principal contractor appointment",
  lead_designer_agreement: "Lead designer agreement", cdm_certification: "CDM principal designer certification",
};
const KIND_FILE: Record<string, string> = {
  pd_appointment: "PD_appointment", pc_appointment: "PC_appointment",
  lead_designer_agreement: "Lead_designer_agreement", cdm_certification: "CDM_certification",
};

export const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/London" }) : "—";
const day = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { dateStyle: "long", timeZone: "Europe/London" }) : "—";

// A calendar date (YYYY-MM-DD), shown as itself whatever the time zone.
const dayOnly = (iso: string | null | undefined) =>
  iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { dateStyle: "long", timeZone: "UTC" }) : "Not recorded";

const COMPLETION = ["CL-16-COMPLETION", "PD-16-COMPLETION", "PC-16-COMPLETION"];
const CONCERN: Record<string, [string, string, string]> = {
  design_concern: ["Design concern", "Principal designer", "Reg 11K(4)"],
  building_concern: ["Building work concern", "Principal contractor", "Reg 11L(4)"],
  pc_comment: ["Principal contractor's comment", "Principal designer", "Reg 11M(4)"],
  pd_comment: ["Principal designer's comment", "Principal contractor", "Reg 11N(4)"],
};

export function slug(value: string, max = 40): string {
  const s = value.normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s-]+/g, "_");
  return (s || "untitled").slice(0, max);
}

export function packRef(project: { name: string; id: string }) {
  return `${slug(project.name)}_${project.id.slice(0, 8)}`;
}

const RAG = (status: string) =>
  status === "complete" ? "Green" : status === "in_progress" || status === "submitted" ? "Amber" : "Red";

export async function buildPack(data: PackData) {
  const ref = packRef(data.project);
  const footer = `Dutyholder evidence pack · ${ref} · generated ${when(data.generatedAt.toISOString())}`;
  const entries = new Map<string, Uint8Array>();
  const warnings: string[] = [];

  const pdf = async (path: string, doc: { kicker: string; title: string; subtitle?: string; sections: Section[] }) => {
    const el = createElement(RecordPdf, { ...doc, footer }) as unknown as ReactElement<DocumentProps>;
    entries.set(path, new Uint8Array(await renderToBuffer(el)));
  };
  const text = (path: string, body: string) => entries.set(path, new TextEncoder().encode(body));

  // One folder per person; names made safe and unique.
  const folders = new Map<string, string>();
  const used = new Set<string>();
  for (const m of data.members) {
    let name = slug(m.name, 30);
    if (used.has(name)) name = `${name}_${m.id.slice(0, 4)}`;
    used.add(name);
    folders.set(m.id, name);
  }
  const member = (id: string) => data.members.find((m) => m.id === id);
  const itemsOf = (m: PackMember) => data.items.filter((i) => i.member_id === m.id);
  const answerOf = (code: string) => data.items.filter((i) => i.code === code && i.answer?.text);

  const p = data.project;
  if (p.is_demo) warnings.push("This is a DEMO project: people and activity are simulated, not real records.");

  // 01 Project ---------------------------------------------------------------
  await pdf("01_Project/Project_summary.pdf", {
    kicker: "Project",
    title: p.name,
    subtitle: p.address,
    sections: [
      { heading: "Set-up answers", blocks: [{ type: "facts", rows: [
        ["Jurisdiction", "England (Building Regulations 2010, Part 2A)"],
        ["Domestic client", p.is_domestic_client ? (p.domestic_duties_to_pd ? "Yes – principal designer carries out client duties (agreed in writing)" : "Yes – contractor side carries out client duties (reg 11C)") : "No"],
        ["Contractors", p.expected_contractors > 1 ? "More than one" : "Only one"],
        ["CDM principal designer certification", p.cdm_pd_certified ? "Yes (reg 11D(2))" : "No"],
        ["Higher-risk building work", "No"],
        ["Construction start (planned)", day(p.construction_start_date)],
        ["Building control application", dayOnly(p.bc_application_date)],
        ["Construction started", dayOnly(p.construction_started_on)],
        ["Early occupation", p.occupation_date ? dayOnly(p.occupation_date) : "None recorded"],
        ["Work completed", dayOnly(p.work_completed_on)],
        ["Records kept for", `${p.retention_years} years after the project`],
        ["Project created", when(p.created_at)],
      ] }] },
      { heading: "Description", blocks: [{ type: "text", text: p.description }] },
      { heading: "Dutyholders", blocks: [{ type: "table", columns: ["Name", "Role", "Discipline", "Email"], widths: [2, 2, 1.2, 2.6],
        rows: data.members.filter((m) => m.role || m.is_owner).map((m) => [
          m.name + (m.is_firm ? " (firm)" : ""), m.role ? ROLE[m.role] : "Project owner", m.discipline ?? "—", m.email,
        ]) }] },
    ],
  });

  for (const [code, title, file] of [
    ["CL-11A-PROGRAMME", "Programme and resources (reg 11A(1)-(3))", "Programme_and_resources_11A.pdf"],
    ["PD-11G-INDIVIDUAL", "Named individual managing the principal designer role (reg 11G)", "PD_named_individual_11G.pdf"],
    ["PD-11M-MATRIX", "Design responsibility matrix (reg 11M)", "Design_responsibility_matrix_11M.pdf"],
  ] as const) {
    const found = answerOf(code);
    if (found.length) {
      await pdf(`01_Project/${file}`, {
        kicker: "Project record", title,
        sections: found.map((i) => ({
          heading: `Recorded by ${member(i.member_id)?.name ?? "—"}${i.completed_at ? `, completed ${when(i.completed_at)}` : " (not marked complete)"}`,
          blocks: [{ type: "text", text: i.answer?.text ?? "" }],
        })),
      });
    }
  }

  // Building information and other item uploads.
  for (const d of data.documents.filter((x) => x.checklist_item_id && !x.withdrawn_at)) {
    const item = data.items.find((i) => i.id === d.checklist_item_id);
    const folder = item?.code === "CL-11A-INFO" ? "01_Project/Building_information" : "01_Project/Uploads";
    addFile(`${folder}/${slug(d.file_name.replace(/\.[^.]+$/, ""), 60)}${extOf(d.file_name)}`, d);
  }

  // 02 Appointments ----------------------------------------------------------
  const kindCount = new Map<string, number>();
  for (const a of data.appointments) {
    const n = (kindCount.get(a.kind) ?? 0) + 1;
    kindCount.set(a.kind, n);
    const suffix = a.status === "void" ? `_VOID_${n}` : a.status === "signed" ? "_signed" : "_awaiting_signatures";
    if (a.status !== "signed") warnings.push(`${KIND[a.kind]}: ${a.status === "void" ? `voided (${a.void_reason})` : "not yet signed by all parties"}.`);
    await pdf(`02_Appointments/${KIND_FILE[a.kind]}${suffix}.pdf`, {
      kicker: KIND[a.kind],
      title: a.letter_title,
      subtitle: a.status === "signed" ? `Signed by all parties ${when(a.completed_at)}` : a.status === "void" ? `VOID: ${a.void_reason}` : "Not yet signed by all parties",
      sections: [
        { blocks: [{ type: "quote", text: a.letter_text }] },
        { heading: "Signatures", blocks: [{ type: "table", columns: ["Name", "Party", "Typed name", "Signed", "IP address"], widths: [2, 1.6, 2, 2, 1.4],
          rows: a.signatures.map((g) => [g.name, g.party, g.typed_name ?? "Not signed", when(g.signed_at), g.ip_address ?? "—"]) }] },
        { heading: "Integrity", blocks: [{ type: "facts", rows: [
          ["Letter SHA-256", hashLines(a.letter_sha256)], ["Template", a.template_version], ["Issued", when(a.created_at)], ["Reference", a.id],
        ] }] },
      ],
    });
  }

  // 03 Competence -----------------------------------------------------------
  const statementSections = (s: PackStatement, isFirm: boolean): Section[] => [
    { heading: "Skills, knowledge and experience (reg 11F)", blocks: [{ type: "facts", rows: [
      ["Skills", s.skills], ["Knowledge", s.knowledge], ["Experience", s.experience],
    ] }] },
    { heading: "Behaviours (reg 11Q(4))", blocks: [{ type: "facts", rows: [
      ["Refusing non-compliant work", s.behaviour_compliance],
      ["Cooperating with others", s.behaviour_cooperation],
      ["Not exceeding competence", s.behaviour_limits],
    ] }] },
    ...(isFirm || s.organisational_capability ? [{ heading: "Organisational capability", blocks: [{ type: "text" as const, text: s.organisational_capability }] }] : []),
    ...(s.has_serious_sanctions !== null ? [{ heading: "Serious sanctions (reg 11E(2))", blocks: [{ type: "text" as const,
      text: s.has_serious_sanctions ? `Yes: ${s.sanctions_details}` : "None declared" }] }] : []),
  ];

  for (const m of data.members) {
    const comp = itemsOf(m).find((i) => i.code === "ALL-11F-COMPETENCE");
    if (!comp) continue;
    const folder = `03_Competence/${folders.get(m.id)}`;
    const reviews = data.reviews.filter((r) => r.checklist_item_id === comp.id);
    const versionIds = new Set([comp.competence_statement_id, ...reviews.map((r) => data.statements.find((s) => s.version === r.statement_version && s.content_sha256 === r.statement_sha256)?.id)]);
    const versions = data.statements.filter((s) => versionIds.has(s.id)).sort((a, b) => a.version - b.version);
    if (!versions.length) {
      text(`${folder}/NOT_SUBMITTED.txt`, `${m.name} has not submitted a competence statement for this project.\r\nStatus: ${comp.status}\r\n`);
      warnings.push(`${m.name}: no competence statement submitted.`);
      continue;
    }
    if (comp.status !== "complete") warnings.push(`${m.name}: competence not yet accepted (${comp.status.replace("_", " ")}).`);
    for (const s of versions) {
      const evidence = data.documents.filter((d) => d.statement_id === s.id);
      const own = reviews.filter((r) => r.statement_version === s.version);
      await pdf(`${folder}/Competence_statement_v${s.version}.pdf`, {
        kicker: "Competence statement",
        title: `${m.name} – version ${s.version}`,
        subtitle: `${m.role ? ROLE[m.role] : ""}${m.is_firm ? " (firm)" : ""} · submitted ${when(s.submitted_at)}${s.id === comp.competence_statement_id ? " · current version for this project" : " · superseded"}`,
        sections: [
          ...statementSections(s, m.is_firm),
          { heading: "Evidence", blocks: evidence.length ? [{ type: "table", columns: ["File", "Size", "SHA-256 (recorded at upload)"], widths: [2.4, 0.8, 4],
            rows: evidence.map((d) => [d.file_name + (d.withdrawn_at ? ` (withdrawn: ${d.withdrawn_reason})` : ""), `${Math.ceil(d.size_bytes / 1024)} KB`, hashLines(d.sha256)]) }] : [{ type: "text", text: "No evidence files." }] },
          { heading: "Review decisions (reg 11E)", blocks: own.length ? [{ type: "table", columns: ["Decision", "Reviewer", "When", "Note"], widths: [1.4, 1.6, 1.8, 3.2],
            rows: own.map((r) => [r.decision === "satisfied" ? "Satisfied" : "Needs more information", r.reviewer_name, when(r.created_at), r.note || "—"]) }] : [{ type: "text", text: "Not yet reviewed." }] },
          { heading: "Integrity", blocks: [{ type: "facts", rows: [["Statement SHA-256", hashLines(s.content_sha256)], ["Version", String(s.version)]] }] },
        ],
      });
      for (const d of evidence.filter((x) => !x.withdrawn_at)) {
        addFile(`${folder}/evidence_v${s.version}/${slug(d.file_name.replace(/\.[^.]+$/, ""), 60)}${extOf(d.file_name)}`, d);
      }
    }
  }

  // 04 Duty acknowledgements ------------------------------------------------
  for (const m of data.members) {
    // Completion statements have their own folder (09_Completion).
    const sigs = data.signatures.filter((g) => g.member_id === m.id && !COMPLETION.includes(g.template_code));
    const acks = itemsOf(m).filter((i) => i.item_type === "acknowledge" && !COMPLETION.includes(i.code));
    if (!acks.length) continue;
    const unsigned = acks.filter((i) => !sigs.some((g) => g.checklist_item_id === i.id));
    if (unsigned.length) warnings.push(`${m.name}: ${unsigned.length} acknowledgement${unsigned.length === 1 ? "" : "s"} not signed.`);
    await pdf(`04_Duty_Acknowledgements/${folders.get(m.id)}/Acknowledgements.pdf`, {
      kicker: "Signed duty acknowledgements",
      title: m.name,
      subtitle: `${m.role ? ROLE[m.role] : ""} · ${sigs.length} of ${acks.length} signed`,
      sections: [
        ...sigs.map((g) => ({
          heading: `${data.items.find((i) => i.id === g.checklist_item_id)?.legal_reference ?? g.template_code} – signed ${when(g.signed_at)}`,
          blocks: [
            { type: "quote" as const, text: g.statement },
            { type: "facts" as const, rows: [
              ["Typed name", g.typed_name], ["IP address", g.ip_address ?? "—"],
              ["Wording SHA-256", hashLines(g.statement_sha256)], ["Template", `${g.template_code} v${g.template_version}`],
            ] as [string, string][] },
          ],
        })),
        ...(unsigned.length ? [{ heading: "Not yet signed", blocks: [{ type: "text" as const, text: unsigned.map((i) => `${i.legal_reference}: ${i.title}`).join("\n") }] }] : []),
      ],
    });
  }

  // 05 Notifications --------------------------------------------------------
  const notify = answerOf("CL-11O-NOTIFY");
  if (notify.length) {
    await pdf("05_Notifications/Building_control_notification_11O.pdf", {
      kicker: "Notification to building control (reg 11O)", title: "Principal appointments notified",
      sections: notify.map((i) => ({ heading: `Recorded by ${member(i.member_id)?.name ?? "—"}, ${i.completed_at ? `completed ${when(i.completed_at)}` : "not marked complete"}`,
        blocks: [{ type: "text", text: i.answer?.text ?? "" }] })),
    });
  }
  if (data.changeReports.length) {
    await pdf("05_Notifications/Change_of_competence_reports_11I.pdf", {
      kicker: "Change of competence (reg 11I)", title: "Reports of a change in competence",
      sections: data.changeReports.map((c) => ({ heading: `${member(c.member_id)?.name ?? "—"}, ${when(c.created_at)}`, blocks: [{ type: "text", text: c.note }] })),
    });
  }

  // 06 Concerns -------------------------------------------------------------
  // Regs 11K(4), 11L(4), 11M(4), 11N(4): each concern or comment with every
  // recorded response, append-only and fingerprinted.
  const concerns = data.concerns ?? [];
  if (!concerns.length) {
    text("06_Concerns/README.txt",
      "Design and compliance concerns (regs 11K(4), 11L(4)) and comments between the principal designer and principal contractor (regs 11M(4), 11N(4)).\r\n\r\nNone have been raised in Dutyholder for this project.\r\n");
  } else {
    const unanswered = concerns.filter((c) => !c.responses.length);
    for (const c of unanswered) warnings.push(`Concern "${c.subject}" (${CONCERN[c.kind]?.[0] ?? c.kind}) has no recorded response.`);
    await pdf("06_Concerns/Concerns_and_responses.pdf", {
      kicker: "Concerns and comments (regs 11K(4), 11L(4), 11M(4), 11N(4))",
      title: p.name,
      subtitle: `${concerns.length} raised · ${concerns.length - unanswered.length} with a recorded response`,
      sections: concerns.map((c) => ({
        heading: `${c.subject} – ${CONCERN[c.kind]?.[0] ?? c.kind}`,
        blocks: [
          { type: "facts" as const, rows: [
            ["Raised by", `${member(c.raised_by_member_id)?.name ?? "—"}, ${when(c.created_at)}`],
            ["Addressed to", CONCERN[c.kind]?.[1] ?? "—"], ["Regulation", CONCERN[c.kind]?.[2] ?? "—"],
            ["Text SHA-256", hashLines(c.body_sha256)],
          ] as [string, string][] },
          { type: "quote" as const, text: c.body },
          ...(c.responses.length ? c.responses.flatMap((r) => [
            { type: "text" as const, text: `Response by ${r.responder_member_id ? member(r.responder_member_id)?.name ?? "—" : "—"}, ${when(r.created_at)}:` },
            { type: "quote" as const, text: r.body },
          ]) : [{ type: "warning" as const, text: "No response recorded." }]),
        ],
      })),
    });
  }

  // 07 Handover -------------------------------------------------------------
  // The 28-day handover documents (11M(5)(b), 11N(5)(b)), one per principal.
  const handovers: { path: string; bytes: Uint8Array }[] = [];
  for (const [code, label, ref, file] of [
    ["PD-11M-HANDOVER", "Principal designer", "11M(5)(b)", "Principal_designer_handover_11M5b"],
    ["PC-11N-HANDOVER", "Principal contractor", "11N(5)(b)", "Principal_contractor_handover_11N5b"],
  ] as const) {
    const found = answerOf(code);
    if (!found.length) continue;
    const path = `07_Handover/${file}.pdf`;
    await pdf(path, {
      kicker: `${label} handover (reg ${ref})`,
      title: code === "PD-11M-HANDOVER"
        ? "Arrangements for planning, managing and monitoring the design work"
        : "Arrangements for planning, managing and monitoring the building work",
      sections: found.map((i) => {
        const m = member(i.member_id);
        return {
          heading: `By ${m?.name ?? "—"}, ${i.completed_at ? when(i.completed_at) : "draft"}`,
          blocks: [
            ...(m?.appointment_ended_on || i.due_date ? [{ type: "facts" as const, rows: [
              ["Appointment ended", dayOnly(m?.appointment_ended_on)],
              ["Due to the client by", dayOnly(i.due_date)],
            ] as [string, string][] }] : []),
            { type: "text" as const, text: i.answer?.text ?? "" },
          ],
        };
      }),
    });
    handovers.push({ path, bytes: entries.get(path)! });
  }
  // Replacement reviews (11M(6), 11N(6)).
  for (const [code, file, ref] of [
    ["PD-11M-REVIEW", "Replacement_principal_designer_review_11M6", "11M(6)"],
    ["PC-11N-REVIEW", "Replacement_principal_contractor_review_11N6", "11N(6)"],
  ] as const) {
    const found = answerOf(code);
    if (!found.length) continue;
    await pdf(`07_Handover/${file}.pdf`, {
      kicker: `Review of the previous arrangements (reg ${ref})`, title: "Replacement review",
      sections: found.map((i) => ({
        heading: `By ${member(i.member_id)?.name ?? "—"}, ${i.completed_at ? when(i.completed_at) : "draft"}`,
        blocks: [{ type: "text" as const, text: i.answer?.text ?? "" }],
      })),
    });
  }
  if (!handovers.length) {
    text("07_Handover/README.txt", "No handover document (reg 11M(5)(b) or 11N(5)(b)) has been recorded yet.\r\n");
  }
  for (const i of data.items) {
    if ((i.code === "PD-11M-HANDOVER" || i.code === "PC-11N-HANDOVER") && i.due_date && i.status !== "complete"
        && Date.parse(`${i.due_date}T23:59:59Z`) < data.generatedAt.getTime()) {
      warnings.push(`${member(i.member_id)?.name ?? "—"}: handover document was due ${dayOnly(i.due_date)} and is not complete.`);
    }
  }

  // 09 Completion -----------------------------------------------------------
  // Reg 16(4), (4A): the completion notice, within 5 days of completion,
  // with signed statements from the client and EACH principal designer and
  // principal contractor, plus both handover documents.
  if (!p.work_completed_on) {
    text("09_Completion/README.txt",
      "The building work has not been marked complete yet. Once it is, this folder holds the completion notice (reg 16(4), (4A)), every signed completion statement and the handover documents.\r\n");
  } else {
    const due = new Date(Date.parse(`${p.work_completed_on}T12:00:00Z`) + 5 * 86_400_000).toISOString().slice(0, 10);
    const statementItems = data.items.filter((i) => COMPLETION.includes(i.code));
    const signedStatements = statementItems.flatMap((i) => {
      const g = data.signatures.find((x) => x.checklist_item_id === i.id);
      return g ? [{ item: i, sig: g }] : [];
    });
    const unsignedStatements = statementItems.filter((i) => !signedStatements.some((x) => x.item.id === i.id));
    for (const i of unsignedStatements) {
      warnings.push(`${member(i.member_id)?.name ?? "—"}: completion statement (reg 16(4A)) not signed; due ${dayOnly(due)}.`);
    }
    const parties = data.members.filter((m) => m.role === "client" || m.role === "principal_designer"
      || m.role === "principal_contractor" || statementItems.some((i) => i.member_id === m.id));

    await pdf("09_Completion/Completion_notice_reg16.pdf", {
      kicker: "Completion notice (Building Regulations 2010, reg 16(4), (4A))",
      title: p.name,
      subtitle: p.address,
      sections: [
        ...(unsignedStatements.length ? [{ heading: "Not ready to send", blocks: unsignedStatements.map((i) => ({
          type: "warning" as const, text: `Statement still to be signed by ${member(i.member_id)?.name ?? "—"}.` })) }] : []),
        { heading: "The work", blocks: [{ type: "facts", rows: [
          ["Statement", `The building work at ${p.address || p.name} was completed on ${dayOnly(p.work_completed_on)}.`],
          ["Notice due to building control by", dayOnly(due)],
        ] }] },
        { heading: "Dutyholders", blocks: [
          { type: "table", columns: ["Role", "Name", "Email", "Phone"], widths: [1.8, 2.2, 2.6, 1.4],
            rows: parties.map((m) => [
              (m.role ? ROLE[m.role] : "—") + (m.appointment_ended_on ? ` (until ${dayOnly(m.appointment_ended_on)})` : ""),
              m.name + (m.company ? `, ${m.company}` : ""), m.email, m.phone || "—",
            ]) },
          { type: "text", text: "Dutyholder doesn't hold postal addresses. Add the address of each person above before the notice is given." },
        ] },
        { heading: "Signed statements", blocks: signedStatements.length ? signedStatements.flatMap(({ item, sig }) => [
          { type: "quote" as const, text: sig.statement },
          { type: "facts" as const, rows: [
            ["Signed by", `${sig.typed_name} (${member(item.member_id)?.name ?? "—"})`], ["Signed", when(sig.signed_at)],
            ["IP address", sig.ip_address ?? "—"], ["Wording SHA-256", hashLines(sig.statement_sha256)],
          ] as [string, string][] },
        ]) : [{ type: "text" as const, text: "No statements signed yet." }] },
        { heading: "Also in this folder", blocks: [{ type: "text", text: handovers.length
          ? "The principal designer's and principal contractor's handover documents (regs 11M(5)(b), 11N(5)(b)), as recorded."
          : "No handover documents have been recorded yet." }] },
      ],
    });
    for (const { item, sig } of signedStatements) {
      const m = member(item.member_id);
      await pdf(`09_Completion/Statements/${folders.get(item.member_id)}_${item.code}.pdf`, {
        kicker: "Signed completion statement (reg 16(4A))", title: m?.name ?? "—",
        subtitle: m?.role ? ROLE[m.role] : "",
        sections: [{ blocks: [
          { type: "quote", text: sig.statement },
          { type: "facts", rows: [
            ["Typed name", sig.typed_name], ["Signed", when(sig.signed_at)], ["IP address", sig.ip_address ?? "—"],
            ["Wording SHA-256", hashLines(sig.statement_sha256)], ["Template", `${sig.template_code} v${sig.template_version}`],
          ] },
        ] }],
      });
    }
    for (const h of handovers) entries.set(h.path.replace("07_Handover/", "09_Completion/Handover/"), h.bytes);
  }

  // 99 Audit trail ----------------------------------------------------------
  entries.set("99_Audit_Trail.csv", new TextEncoder().encode(toCsv(
    ["When (UTC)", "Who", "Action", "Record type", "Record id", "IP address", "Details"],
    data.audit.map((a) => [a.occurred_at, a.actor, a.action, a.entity_type, a.entity_id, a.ip_address, a.details]),
  )));

  // 00 Index (last, so it can list every other file's fingerprint) ---------
  const manifest = [...entries.entries()]
    .map(([path, bytes]) => ({ path, size: bytes.length, sha256: sha256(bytes) }))
    .sort((a, b) => a.path.localeCompare(b.path));
  const statusRows = data.members.filter((m) => itemsOf(m).length).map((m) => {
    const items = itemsOf(m);
    const count = (c: string) => items.filter((i) => RAG(i.status) === c).length;
    return [m.name, m.role ? ROLE[m.role] : "Owner", String(count("Green")), String(count("Amber")), String(count("Red"))];
  });
  await pdf("00_Index.pdf", {
    kicker: "Evidence pack – index",
    title: p.name,
    subtitle: `Building Regulations 2010, Part 2A dutyholder records · generated ${when(data.generatedAt.toISOString())}`,
    sections: [
      ...(warnings.length ? [{ heading: "Points to note", blocks: warnings.map((w) => ({ type: "warning" as const, text: w })) }] : []),
      { heading: "Status (red / amber / green)", blocks: [{ type: "table", columns: ["Person", "Role", "Green", "Amber", "Red"], widths: [2.4, 2, 0.8, 0.8, 0.8], rows: statusRows }] },
      { heading: "Contents", blocks: [
        { type: "text", text: "Each file's SHA-256 fingerprint is listed so anyone can check it has not been changed since this pack was generated. Evidence files were re-checked against the fingerprint recorded when they were uploaded." },
        { type: "table", columns: ["File", "Size", "SHA-256"], widths: [3.6, 0.7, 3.8], rows: manifest.map((f) => [pathLines(f.path), `${Math.max(1, Math.ceil(f.size / 1024))} KB`, hashLines(f.sha256)]) },
      ] },
    ],
  });

  const prefixed = new Map([...entries.entries()].map(([path, bytes]) => [`${ref}/${path}`, bytes]));
  return { ref, entries: prefixed, manifest, warnings };

  // Adds an original uploaded file, after checking its fingerprint.
  function addFile(path: string, d: { storage_path: string; sha256: string; file_name: string }) {
    const bytes = data.files.get(d.storage_path);
    if (!bytes) {
      warnings.push(`Missing file: ${d.file_name} could not be retrieved from storage.`);
      return;
    }
    if (sha256(bytes) !== d.sha256) {
      warnings.push(`FINGERPRINT MISMATCH: ${d.file_name} does not match the SHA-256 recorded at upload.`);
    }
    let unique = path;
    for (let n = 2; entries.has(unique); n++) unique = path.replace(/(\.[^./]+)?$/, `_${n}$1`);
    entries.set(unique, bytes);
  }
}

function extOf(name: string): string {
  const m = /\.[A-Za-z0-9]{1,6}$/.exec(name);
  return m ? m[0].toLowerCase() : "";
}

export { csvCell };
