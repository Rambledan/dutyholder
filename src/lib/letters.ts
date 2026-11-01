// Appointment letter templates. Pure functions, used both to preview a letter
// in the browser and to produce the exact text the server freezes,
// fingerprints and sends for signature.
//
// DRAFT WORDING: to be reviewed by the principal designer and ideally a
// construction lawyer before real signatures are collected. Change the
// wording by bumping TEMPLATE_VERSION; issued letters keep the text they had.

export const TEMPLATE_VERSION = "v1-draft-2026-11";

export type AppointmentKind = "pd_appointment" | "pc_appointment" | "lead_designer_agreement" | "cdm_certification";

export const KIND_LABELS: Record<AppointmentKind, string> = {
  pd_appointment: "Principal designer appointment",
  pc_appointment: "Principal contractor appointment",
  lead_designer_agreement: "Lead designer agreement",
  cdm_certification: "CDM principal designer certification",
};

// Which checklist item each kind of appointment belongs to.
export const KIND_BY_CODE: Record<string, AppointmentKind> = {
  "CL-11D-APPOINT-PD": "pd_appointment",
  "CL-11D-APPOINT-PC": "pc_appointment",
  "DES-11D-LEAD": "lead_designer_agreement",
  "CL-11D-CDM": "cdm_certification",
};

export const PARTY_LABELS: Record<string, string> = {
  appointer: "Client (appointing)",
  appointee: "Appointee",
  designer: "Designer",
};

// On a domestic project the appointer signs on the client's behalf (reg 11C).
export function partyLabel(party: string, domesticClient: boolean): string {
  if (party === "appointer" && domesticClient) return "Signing for the client";
  return PARTY_LABELS[party] ?? party;
}

export type Person = { name: string; company?: string | null; isFirm?: boolean };

export type LetterInput = {
  kind: AppointmentKind;
  projectName: string;
  projectAddress: string;
  date: string; // e.g. "1 November 2026"
  clients: Person[]; // members with the client role
  domesticClient: boolean;
  appointers: Person[]; // who signs for the client (or the designers, for a lead designer agreement)
  appointee: Person;
  scope: string;
};

const who = (p: Person) => (p.company ? `${p.name} (${p.company})` : p.name);
const list = (people: Person[]) => people.map(who).join(", ") || "[to be confirmed]";

export function buildLetter(i: LetterInput): { title: string; text: string } {
  const header = [
    `Project: ${i.projectName}`,
    ...(i.projectAddress ? [`Site: ${i.projectAddress}`] : []),
    `Date: ${i.date}`,
    "",
  ];
  const scope = i.scope.trim() ? ["", "Scope and notes:", i.scope.trim()] : [];
  // On a domestic project the client's duties pass to others (reg 11C), who
  // sign on the client's behalf. Name the real client and say so.
  const clientLines = [
    `Client: ${list(i.clients)}${i.domesticClient ? " (domestic client)" : ""}`,
    ...(i.domesticClient
      ? [`Signing for the client: ${list(i.appointers)}, who carry out the client's duties under regulation 11C.`]
      : []),
  ];
  const firm = i.appointee.isFirm
    ? [
        "",
        `As the appointee is a firm, it will name the individual who manages this role (regulation 11G).`,
      ]
    : [];

  switch (i.kind) {
    case "pd_appointment":
      return {
        title: `Appointment of principal designer – ${i.projectName}`,
        text: [
          "Appointment of principal designer",
          "Building Regulations 2010, Part 2A, regulation 11D(1)",
          "",
          ...header,
          ...clientLines,
          `Principal designer: ${who(i.appointee)}`,
          "",
          `1. More than one contractor is, or is likely to be, working on this project. The client appoints ${who(i.appointee)} as principal designer under regulation 11D(1) of the Building Regulations 2010.`,
          "",
          "2. The principal designer accepts the appointment and the duties of a principal designer under Part 2A: to plan, manage, monitor and coordinate the design work so that, if built, it would comply with all relevant requirements; to make sure designers cooperate and comply with their duties; to liaise with the principal contractor; and, within 28 days of the appointment ending, to give the client a document explaining the arrangements made (regulation 11M(5)(b)).",
          "",
          "3. The parties confirm this appointment is made before the construction phase starts.",
          ...firm,
          ...scope,
        ].join("\n"),
      };
    case "pc_appointment":
      return {
        title: `Appointment of principal contractor – ${i.projectName}`,
        text: [
          "Appointment of principal contractor",
          "Building Regulations 2010, Part 2A, regulation 11D(1)",
          "",
          ...header,
          ...clientLines,
          `Principal contractor: ${who(i.appointee)}`,
          "",
          `1. More than one contractor is, or is likely to be, working on this project. The client appoints ${who(i.appointee)} as principal contractor under regulation 11D(1) of the Building Regulations 2010.`,
          "",
          "2. The principal contractor accepts the appointment and the duties of a principal contractor under Part 2A: to plan, manage, monitor and coordinate the building work during the construction phase so that it complies with all relevant requirements; to make sure contractors cooperate and comply with their duties; and to liaise with the principal designer.",
          "",
          "3. The parties confirm this appointment is made before the construction phase starts.",
          ...firm,
          ...scope,
        ].join("\n"),
      };
    case "lead_designer_agreement":
      return {
        title: `Lead designer agreement – ${i.projectName}`,
        text: [
          "Lead designer agreement",
          "Building Regulations 2010, Part 2A, regulation 11D(6)-(7)",
          "",
          ...header,
          `Designers: ${list(i.appointers)}`,
          `Lead designer: ${who(i.appointee)}`,
          "",
          "1. Only one contractor is, or is likely to be, working on this project, so no principal designer or principal contractor is appointed.",
          "",
          `2. The designers named above agree in writing that ${who(i.appointee)} is the lead designer for the project, and will take the lead in coordinating the design work and liaising with the contractor.`,
          ...scope,
        ].join("\n"),
      };
    case "cdm_certification":
      return {
        title: `CDM principal designer certification – ${i.projectName}`,
        text: [
          "Certification that the CDM principal designer is also the Building Regulations principal designer",
          "Building Regulations 2010, Part 2A, regulation 11D(2)",
          "",
          ...header,
          ...clientLines,
          `Principal designer: ${who(i.appointee)}`,
          "",
          `The client certifies that ${who(i.appointee)}, appointed as principal designer under the Construction (Design and Management) Regulations 2015, is also appointed as principal designer for the purposes of Part 2A of the Building Regulations 2010.`,
        ].join("\n"),
      };
  }
}

export function formatLetterDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
}
