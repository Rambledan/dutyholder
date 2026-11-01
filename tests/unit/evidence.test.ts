import { describe, expect, it } from "vitest";
import { buildPack, sha256 } from "@/lib/evidence/build";
import { csvCell, toCsv } from "@/lib/evidence/csv";
import type { PackData } from "@/lib/evidence/types";

const bytes = (s: string) => new TextEncoder().encode(s);
const CERT = bytes("%PDF-1.4 fake certificate");

function data(overrides: Partial<PackData> = {}): PackData {
  return {
    generatedAt: new Date("2026-11-20T10:00:00Z"),
    project: {
      id: "11111111-2222-3333-4444-555555555555", name: "Mill Lane Extension", address: "1 Mill Lane", description: "Rear extension",
      is_domestic_client: false, domestic_duties_to_pd: false, expected_contractors: 3, cdm_pd_certified: false,
      construction_start_date: "2027-01-11", retention_years: 15, is_demo: false, created_at: "2026-11-01T09:00:00Z",
    },
    members: [
      { id: "m-sam", name: "Sam Structures", email: "sam@x.test", role: "designer", discipline: "structural", is_firm: false, is_owner: false, removed_at: null },
      { id: "m-pd", name: "Pat Designer", email: "pat@x.test", role: "principal_designer", discipline: null, is_firm: false, is_owner: true, removed_at: null },
    ],
    items: [
      { id: "i-ack", member_id: "m-sam", code: "DES-11K-DESIGNER", title: "Acknowledge your duties as a designer", legal_reference: "Reg 11K",
        item_type: "acknowledge", status: "complete", answer: null, completed_at: "2026-11-02T10:00:00Z", competence_statement_id: null },
      { id: "i-comp", member_id: "m-sam", code: "ALL-11F-COMPETENCE", title: "Submit your competence statement", legal_reference: "Reg 11F",
        item_type: "form", status: "complete", answer: null, completed_at: "2026-11-04T10:00:00Z", competence_statement_id: "s1" },
      { id: "i-hand", member_id: "m-pd", code: "PD-11M-HANDOVER", title: "Handover", legal_reference: "Reg 11M(5)(b)",
        item_type: "form", status: "complete", answer: { text: "Arrangements were…" }, completed_at: "2026-11-10T10:00:00Z", competence_statement_id: null },
    ],
    signatures: [{ checklist_item_id: "i-ack", member_id: "m-sam", typed_name: "Sam Structures", statement: "I confirm…",
      statement_sha256: "a".repeat(64), template_code: "DES-11K-DESIGNER", template_version: 1, signed_at: "2026-11-02T10:00:00Z", ip_address: "1.2.3.4" }],
    statements: [{ id: "s1", version: 1, status: "submitted", submitted_at: "2026-11-03T10:00:00Z", content_sha256: "b".repeat(64),
      skills: "Steel", knowledge: "Eurocodes", experience: "12 extensions", behaviour_compliance: "Refuse", behaviour_cooperation: "Share",
      behaviour_limits: "Decline", organisational_capability: "", has_serious_sanctions: null, sanctions_details: "" }],
    documents: [{ id: "d1", file_name: "CEng certificate.pdf", mime_type: "application/pdf", size_bytes: CERT.length, sha256: sha256(CERT),
      storage_path: "u1/d1-cert.pdf", created_at: "2026-11-03T09:00:00Z", withdrawn_at: null, withdrawn_reason: null,
      statement_id: "s1", checklist_item_id: null }],
    reviews: [{ checklist_item_id: "i-comp", statement_version: 1, statement_sha256: "b".repeat(64), reviewer_name: "Chris Client",
      decision: "satisfied", note: "Chartered", created_at: "2026-11-04T10:00:00Z" }],
    changeReports: [],
    appointments: [{ id: "a1", kind: "pd_appointment", status: "signed", letter_title: "Appointment of principal designer",
      letter_text: "The client appoints…", letter_sha256: "c".repeat(64), template_version: "v1", created_at: "2026-11-02T10:00:00Z",
      completed_at: "2026-11-03T10:00:00Z", void_reason: null,
      signatures: [{ name: "Pat Designer", party: "appointee", typed_name: "Pat Designer", signed_at: "2026-11-03T10:00:00Z", ip_address: "1.2.3.4" }] }],
    audit: [{ occurred_at: "2026-11-01T09:00:00Z", actor: "Pat Designer", action: "project.created", entity_type: "project",
      entity_id: "p", ip_address: null, details: { name: "=HYPERLINK(\"evil\")" } }],
    files: new Map([["u1/d1-cert.pdf", CERT]]),
    ...overrides,
  };
}

describe("evidence pack", () => {
  it("lays out the folders from PLAN.md under the project's reference", async () => {
    const pack = await buildPack(data());
    const paths = [...pack.entries.keys()].map((p) => p.replace(`${pack.ref}/`, ""));
    expect(pack.ref).toBe("Mill_Lane_Extension_11111111");
    expect(paths).toEqual(expect.arrayContaining([
      "00_Index.pdf",
      "01_Project/Project_summary.pdf",
      "02_Appointments/PD_appointment_signed.pdf",
      "03_Competence/Sam_Structures/Competence_statement_v1.pdf",
      "03_Competence/Sam_Structures/evidence_v1/CEng_certificate.pdf",
      "04_Duty_Acknowledgements/Sam_Structures/Acknowledgements.pdf",
      "06_Concerns/README.txt",
      "07_Handover/Principal_designer_handover_11M5b.pdf",
      "99_Audit_Trail.csv",
    ]));
    for (const [path, b] of pack.entries) {
      if (path.endsWith(".pdf") && !path.includes("evidence_v")) expect(new TextDecoder().decode(b.slice(0, 5))).toBe("%PDF-");
    }
  });

  it("includes original evidence byte-for-byte and fingerprints every file in the manifest", async () => {
    const pack = await buildPack(data());
    const cert = pack.entries.get(`${pack.ref}/03_Competence/Sam_Structures/evidence_v1/CEng_certificate.pdf`)!;
    expect(sha256(cert)).toBe(sha256(CERT));
    for (const f of pack.manifest) {
      expect(sha256(pack.entries.get(`${pack.ref}/${f.path}`)!)).toBe(f.sha256);
    }
    expect(pack.warnings).toEqual([]);
  });

  it("flags evidence that has changed since upload, or has gone missing", async () => {
    const tampered = await buildPack(data({ files: new Map([["u1/d1-cert.pdf", bytes("something else")]]) }));
    expect(tampered.warnings.some((w) => w.startsWith("FINGERPRINT MISMATCH: CEng certificate.pdf"))).toBe(true);
    const missing = await buildPack(data({ files: new Map([["u1/d1-cert.pdf", null]]) }));
    expect(missing.warnings.some((w) => w.startsWith("Missing file"))).toBe(true);
  });

  it("notes unsigned letters, unreviewed competence and demo projects", async () => {
    const d = data();
    d.appointments[0].status = "awaiting_signatures";
    d.items[1].status = "submitted";
    d.project.is_demo = true;
    const pack = await buildPack(d);
    expect(pack.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining("DEMO"),
      expect.stringContaining("not yet signed by all parties"),
      expect.stringContaining("competence not yet accepted"),
    ]));
    expect([...pack.entries.keys()].some((p) => p.endsWith("PD_appointment_awaiting_signatures.pdf"))).toBe(true);
  });
});

describe("audit trail CSV", () => {
  it("quotes everything and defuses spreadsheet formulas", () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("=SUM(A1)")).toBe(`"'=SUM(A1)"`);
    expect(csvCell("-1+2")).toBe(`"'-1+2"`);
    expect(csvCell({ a: 1 })).toBe('"{""a"":1}"');
    expect(toCsv(["a", "b"], [["1", null]])).toBe('"a","b"\r\n"1",""\r\n');
  });
});
