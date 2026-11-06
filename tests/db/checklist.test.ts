import { afterAll, describe, expect, it } from "vitest";
import type { PoolClient } from "pg";
import {
  activeCodesByEmail, addMember, createProject, inTransaction, pool, signUpUser, testEmail,
  type ProjectOptions,
} from "./helpers";

afterAll(() => pool?.end());

const CLIENT_CORE = ["CL-11A-ARRANGE", "CL-11A-INFO", "CL-11A-PROGRAMME", "CL-11E-REVIEW-ENGAGED", "CL-16-COMPLETION", "BRF-CL"];
const CLIENT_APPOINTMENTS = [
  "CL-11D-APPOINT-PC", "CL-11D-APPOINT-PD", "CL-11D-TIMING", "CL-11E-REVIEW-PC", "CL-11E-REVIEW-PD", "CL-11O-NOTIFY",
];
const DESIGNER = ["ALL-11F-COMPETENCE", "ALL-11I-CHANGE", "ALL-11J-GENERAL", "DES-11K-DESIGNER"];
const CONTRACTOR = ["ALL-11F-COMPETENCE", "ALL-11I-CHANGE", "ALL-11J-GENERAL", "CON-11L-CONTRACTOR"];
const PD_ONLY = ["PD-11M-ACK", "PD-11M-HANDOVER", "PD-11M-MATRIX", "PD-16-COMPLETION", "BRF-PD"];
// Phase 8: the principal contractor's handover and completion statement.
const PC_ONLY = ["PC-11N-HANDOVER", "PC-16-COMPLETION", "BRF-PC"];
// Phase 9: each role's briefing.
const DES_BRIEF = "BRF-DES";
const CON_BRIEF = "BRF-CON";

const sorted = (codes: string[]) => [...codes].sort();

// A project with the owner as principal designer plus four other members.
async function fivePersonProject(db: PoolClient, opts: ProjectOptions = {}) {
  const owner = await signUpUser(db, "owner");
  const projectId = await createProject(db, owner.id, opts);
  const emails = {
    pd: owner.email,
    client: testEmail("client"),
    designer: testEmail("designer"),
    pc: testEmail("pc"),
    contractor: testEmail("contractor"),
  };
  await addMember(db, owner.id, projectId, emails.client, "client");
  await addMember(db, owner.id, projectId, emails.designer, "designer");
  await addMember(db, owner.id, projectId, emails.pc, "principal_contractor");
  await addMember(db, owner.id, projectId, emails.contractor, "contractor");
  return { owner, projectId, emails };
}

describe("generate_checklist", () => {
  it("gives each of the five roles the right duties", () =>
    inTransaction(async (db) => {
      const { projectId, emails } = await fivePersonProject(db);
      const codes = await activeCodesByEmail(db, projectId);

      expect(codes[emails.client]).toEqual(sorted([...CLIENT_CORE, ...CLIENT_APPOINTMENTS, "ALL-11J-GENERAL"]));
      expect(codes[emails.pd]).toEqual(sorted([...DESIGNER, ...PD_ONLY]));
      expect(codes[emails.designer]).toEqual(sorted([...DESIGNER, DES_BRIEF]));
      expect(codes[emails.pc]).toEqual(sorted([...CONTRACTOR, ...PC_ONLY]));
      expect(codes[emails.contractor]).toEqual(sorted([...CONTRACTOR, CON_BRIEF]));
    }));

  it("moves a domestic client's duties to the principal contractor, and the 11O notice to the principal designer", () =>
    inTransaction(async (db) => {
      const { projectId, emails } = await fivePersonProject(db, { isDomesticClient: true });
      const codes = await activeCodesByEmail(db, projectId);

      expect(codes[emails.client]).toBeUndefined();
      expect(codes[emails.pc]).toEqual(
        sorted([...CONTRACTOR, ...PC_ONLY, ...CLIENT_CORE, ...CLIENT_APPOINTMENTS.filter((c) => c !== "CL-11O-NOTIFY")]),
      );
      expect(codes[emails.pd]).toEqual(sorted([...DESIGNER, ...PD_ONLY, "CL-11O-NOTIFY"]));
    }));

  it("moves all of a domestic client's duties to the principal designer when agreed in writing", () =>
    inTransaction(async (db) => {
      const { projectId, emails } = await fivePersonProject(db, { isDomesticClient: true, domesticDutiesToPd: true });
      const codes = await activeCodesByEmail(db, projectId);

      expect(codes[emails.client]).toBeUndefined();
      expect(codes[emails.pc]).toEqual(sorted([...CONTRACTOR, ...PC_ONLY]));
      expect(codes[emails.pd]).toEqual(sorted([...DESIGNER, ...PD_ONLY, ...CLIENT_CORE, ...CLIENT_APPOINTMENTS]));
    }));

  it("with one contractor: no principal appointments, and designers agree a lead designer", () =>
    inTransaction(async (db) => {
      const { projectId, emails } = await fivePersonProject(db, { expectedContractors: 1 });
      const codes = await activeCodesByEmail(db, projectId);

      expect(codes[emails.client]).toEqual(sorted([...CLIENT_CORE, "ALL-11J-GENERAL"]));
      expect(codes[emails.designer]).toEqual(sorted([...DESIGNER, DES_BRIEF, "DES-11D-LEAD"]));
    }));

  it("gives a sole contractor the client's duties on a domestic project (they are the principal contractor)", () =>
    inTransaction(async (db) => {
      const owner = await signUpUser(db, "owner");
      const projectId = await createProject(db, owner.id, { isDomesticClient: true, expectedContractors: 1 });
      const builder = testEmail("builder");
      await addMember(db, owner.id, projectId, builder, "contractor");
      const codes = await activeCodesByEmail(db, projectId);

      expect(codes[builder]).toEqual(sorted([...CONTRACTOR, CON_BRIEF, ...PC_ONLY, ...CLIENT_CORE]));
    }));

  it("adds the CDM certification only when the client has ticked it", () =>
    inTransaction(async (db) => {
      const { projectId, emails } = await fivePersonProject(db, { cdmPdCertified: true });
      const codes = await activeCodesByEmail(db, projectId);
      expect(codes[emails.client]).toContain("CL-11D-CDM");
    }));

  it("asks a principal designer firm to name its individual", () =>
    inTransaction(async (db) => {
      const owner = await signUpUser(db, "owner");
      const projectId = await createProject(db, owner.id, { ownerRole: "client" });
      const firm = testEmail("pd-firm");
      await addMember(db, owner.id, projectId, firm, "principal_designer", true);
      const codes = await activeCodesByEmail(db, projectId);
      expect(codes[firm]).toContain("PD-11G-INDIVIDUAL");
    }));

  it("withdraws items when an answer changes, never deletes them, and restores them when it changes back", () =>
    inTransaction(async (db) => {
      const { projectId, emails } = await fivePersonProject(db);
      const before = await db.query("select count(*)::int as n from public.checklist_items where project_id = $1", [projectId]);

      await db.query("update public.projects set is_domestic_client = true where id = $1", [projectId]);
      let codes = await activeCodesByEmail(db, projectId);
      expect(codes[emails.client]).toBeUndefined();
      const withdrawn = await db.query(
        `select count(*)::int as n from public.checklist_items i join public.project_members m on m.id = i.member_id
         where m.email = $1 and i.withdrawn_at is not null`,
        [emails.client],
      );
      expect(withdrawn.rows[0].n).toBeGreaterThan(0);

      await db.query("update public.projects set is_domestic_client = false where id = $1", [projectId]);
      codes = await activeCodesByEmail(db, projectId);
      expect(codes[emails.client]).toContain("CL-11A-ARRANGE");

      // Restored items are the same rows, not duplicates.
      const clientRows = await db.query(
        `select count(*)::int as n from public.checklist_items i join public.project_members m on m.id = i.member_id
         where m.email = $1 and i.template_code = 'CL-11A-ARRANGE'`,
        [emails.client],
      );
      expect(clientRows.rows[0].n).toBe(1);

      const after = await db.query("select count(*)::int as n from public.checklist_items where project_id = $1", [projectId]);
      expect(after.rows[0].n).toBeGreaterThanOrEqual(before.rows[0].n);

      const audit = await db.query(
        "select count(*)::int as n from public.audit_log where project_id = $1 and action = 'checklist.generated'",
        [projectId],
      );
      expect(audit.rows[0].n).toBeGreaterThan(0);
    }));

  it("withdraws a removed member's items", () =>
    inTransaction(async (db) => {
      const { projectId, emails } = await fivePersonProject(db);
      await db.query("update public.project_members set removed_at = now() where email = $1", [emails.designer]);
      const codes = await activeCodesByEmail(db, projectId);
      expect(codes[emails.designer]).toBeUndefined();
    }));

  it("refuses to edit or delete a duty template", () =>
    inTransaction(async (db) => {
      await db.query("savepoint s");
      await expect(db.query("update public.duty_templates set title = 'x' where code = 'ALL-11J-GENERAL'")).rejects.toThrow(
        /never edited/,
      );
      await db.query("rollback to savepoint s");
      await expect(db.query("delete from public.duty_templates where code = 'ALL-11J-GENERAL'")).rejects.toThrow(
        /never edited/,
      );
      await db.query("rollback to savepoint s");
    }));
});
