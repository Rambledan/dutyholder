// All help text in one place, so it can be checked and edited without
// touching any screens. Topics appear on /help; terms power the ⓘ marks.
//
// This is general guidance for using the app, not legal advice. The
// principal designer (and ideally a construction lawyer) should review it.

export type HelpBlock = { p: string } | { list: string[] } | { note: string };

export type HelpTopic = {
  id: string;
  title: string;
  category: "Getting started" | "The law" | "Roles" | "Doing your tasks" | "Running a project" | "Security and records";
  summary: string;
  body: HelpBlock[];
};

export const HELP_TOPICS: HelpTopic[] = [
  // Getting started ----------------------------------------------------------
  {
    id: "getting-started",
    title: "What Dutyholder does",
    category: "Getting started",
    summary: "One place to appoint the project team, record their duties and competence, and keep the evidence.",
    body: [
      { p: "Under Part 2A of the Building Regulations 2010, everyone who commissions, designs or builds work in England has legal duties. Dutyholder gives each person a short list of the things the law asks of them, collects their signatures and competence evidence, chases politely until everything is done, and produces a tidy evidence pack." },
      { list: [
        "The project owner (usually the principal designer) sets up the project and adds the team.",
        "Each person gets an invite, signs in with two-factor, and works through Your tasks.",
        "The client (or owner) reviews competence and signs the appointments.",
        "When everything is green, the owner exports the evidence pack.",
      ] },
      { note: "This app helps you record what the law asks for. It is not legal advice." },
    ],
  },
  {
    id: "invites",
    title: "Invites and signing up",
    category: "Getting started",
    summary: "Accounts are by invitation only. Each link works once, for one email address, for 7 days.",
    body: [
      { p: "The project owner adds you to a project and clicks Invite. You get a link by email (or the owner sends it to you). It works once, only for your email address, and expires after 7 days. If it has expired, ask for a new one: the new link cancels the old." },
      { p: "Signing up takes a few minutes: choose a password (at least 12 characters), then set up two-factor login on your phone and save your recovery codes. After that you go straight to your tasks." },
    ],
  },

  // The law ------------------------------------------------------------------
  {
    id: "part-2a",
    title: "Building Regulations Part 2A",
    category: "The law",
    summary: "The dutyholder rules in force in England since 1 October 2023 (regulations 11A to 11Q).",
    body: [
      { p: "Part 2A of the Building Regulations 2010 sets out who is responsible for making sure building work complies, and what each of them must do. It applies to building work in England from 1 October 2023. Wales has a similar regime (Part 2B) from July 2026, which this version of the app does not cover." },
      { p: "In short: the client must make suitable arrangements and appoint the principal designer and principal contractor where needed; everyone who designs or builds must be competent, plan and manage their own work, and cooperate; and the principal designer and principal contractor coordinate design and construction." },
      { p: "The Building Safety Regulator oversees the building control system. Each task in the app shows the regulation it comes from, with a link to the law on legislation.gov.uk." },
    ],
  },
  {
    id: "higher-risk",
    title: "Higher-risk buildings",
    category: "The law",
    summary: "Buildings at least 18m or 7 storeys with 2+ homes, or hospitals and care homes. Not supported yet.",
    body: [
      { p: "Higher-risk building work (broadly, buildings at least 18 metres or 7 storeys high with two or more homes, and some hospitals and care homes) has extra requirements, including a Gateway 2 application to the Building Safety Regulator and extra competence questions." },
      { p: "This version of Dutyholder does not support higher-risk work, so it asks at set-up and won't create a higher-risk project rather than half-support it." },
    ],
  },
  {
    id: "cdm",
    title: "CDM 2015 and the principal designer",
    category: "The law",
    summary: "The health and safety principal designer (CDM) can also be named as the Building Regulations one.",
    body: [
      { p: "The Construction (Design and Management) Regulations 2015 (CDM) also have a principal designer, for health and safety. Under regulation 11D(2), the client can certify that the person appointed as principal designer under CDM is also the principal designer for Building Regulations purposes." },
      { p: "If you tick this option at project set-up, the client gets an extra document to sign: the CDM certification." },
    ],
  },
  {
    id: "notifications",
    title: "Deadlines: building control notice and handover",
    category: "The law",
    summary: "Notify building control within 14 days of principal appointments; hand over within 28 days of the PD role ending.",
    body: [
      { list: [
        "Regulation 11O: the building control body must be told about principal designer and principal contractor appointments within 14 days (the principal designer does this for a domestic client).",
        "Regulation 11M(5)(b): within 28 days of their appointment ending, the principal designer must give the client a document explaining the arrangements they made.",
      ] },
      { p: "Both appear as tasks for whoever holds the duty, and are filed in the evidence pack." },
    ],
  },

  // Roles --------------------------------------------------------------------
  {
    id: "roles",
    title: "The five dutyholder roles",
    category: "Roles",
    summary: "Client, principal designer, designer, principal contractor and contractor.",
    body: [
      { list: [
        "Client: the person or organisation the work is done for. Makes arrangements, provides building information, appoints the principals and checks their competence.",
        "Principal designer: plans, manages, monitors and coordinates the design work, and makes sure designers cooperate and comply.",
        "Designer: anyone who prepares or modifies designs (for example architects, structural, fire or MEP engineers).",
        "Principal contractor: plans, manages, monitors and coordinates the building work during construction.",
        "Contractor: anyone who carries out the building work.",
      ] },
      { p: "Your role is per project: you might be a designer on one project and the principal designer on another. The project owner is whoever runs the project in the app (usually the principal designer); being the owner is not a legal role." },
      { p: "The app gives the principal designer the designer duties too, and the principal contractor the contractor duties." },
    ],
  },
  {
    id: "domestic-client",
    title: "Domestic clients",
    category: "Roles",
    summary: "A homeowner having work done on their own home. Their duties pass to others (reg 11C).",
    body: [
      { p: "A domestic client is someone having work done on their own home, not in the course of a business. Under regulation 11C their duties are carried out by others: by the contractor (or principal contractor), or by the principal designer if the client agrees that in writing." },
      { p: "In the app, answering Yes at set-up moves the client's tasks to whoever takes them on. Letters still name the client, and say who signs on their behalf." },
    ],
  },
  {
    id: "principal-appointments",
    title: "Appointments and the lead designer",
    category: "Roles",
    summary: "With more than one contractor, the client appoints a principal designer and principal contractor in writing.",
    body: [
      { p: "Where more than one contractor is, or is likely to be, working on the project, the client must appoint a principal designer and a principal contractor in writing, before the construction phase starts (regulation 11D)." },
      { p: "With only one contractor, no principal appointments are needed: that contractor is treated as the principal contractor, and the designers agree in writing who is the lead designer." },
      { p: "In the app, the owner prepares each letter from a template and issues it. The client (the appointer) and the person appointed (the appointee) each sign with their typed name. Once issued, a letter can't be edited; if something is wrong, the owner voids it with a reason and issues a new one." },
      { note: "Letter wording is a draft for the principal designer and a lawyer to review before real signatures are collected." },
    ],
  },
  {
    id: "firms",
    title: "Firms and named individuals",
    category: "Roles",
    summary: "When a firm holds a role, it also describes its organisational capability.",
    body: [
      { p: "A role can be held by a firm rather than an individual. A firm's competence statement also covers its organisational capability: the systems, people and resources it has to do the work in compliance." },
      { p: "Where the principal designer is a firm, it must name the individual who manages the role (regulation 11G)." },
    ],
  },

  // Doing your tasks -----------------------------------------------------------
  {
    id: "tasks",
    title: "Your tasks",
    category: "Doing your tasks",
    summary: "A short list of what the law asks of you on this project, with progress.",
    body: [
      { p: "Your tasks are worked out from your role and the project's set-up answers. Each one shows the regulation it comes from, in plain English. Most take a minute or two; the competence statement takes longest. Everything saves as you go, so you can stop and come back." },
      { list: [
        "Acknowledge: read the duty and sign with your typed name.",
        "Form: write a short answer (saves automatically).",
        "Upload: add files, then mark as done.",
        "Sign: read and sign an appointment letter.",
        "Review: check someone else's competence.",
      ] },
    ],
  },
  {
    id: "signatures",
    title: "Signing with your typed name",
    category: "Doing your tasks",
    summary: "A simple electronic signature: you type your name and tick a statement.",
    body: [
      { p: "To sign, you tick a statement and type your full name exactly as it appears on your account. The app records your name, the time, your IP address and a fingerprint of the exact wording you agreed to. That record can't be edited or deleted." },
      { p: "Simple electronic signatures like this are generally accepted for contracts in England, but have a lawyer confirm this for appointment letters." },
    ],
  },
  {
    id: "competence",
    title: "Your competence statement",
    category: "Doing your tasks",
    summary: "Skills, knowledge, experience and behaviours (reg 11F), with evidence.",
    body: [
      { p: "Regulation 11F says everyone who designs or builds must have the skills, knowledge, experience and behaviours needed for their work (and, for a firm, the organisational capability). Regulation 11Q(4) spells out three behaviours: refusing work that wouldn't comply, cooperating with others, and not taking on work beyond your competence. The form asks about each one." },
      { p: "Add evidence such as qualifications, professional memberships, insurance certificates and comparable projects: PDF, photos, Word or Excel, up to 20 MB each." },
      { p: "Your statement belongs to you, not the project. Once submitted it's locked and fingerprinted. On your next project you can reuse it as it is, or update it, which creates a new version. Earlier versions are kept." },
    ],
  },
  {
    id: "reviews",
    title: "Competence reviews",
    category: "Doing your tasks",
    summary: "Whoever appoints someone must take reasonable steps to be satisfied they are competent (reg 11E).",
    body: [
      { p: "A self-declaration on its own is weak. What matters legally is that whoever appoints someone has taken reasonable steps to satisfy themselves that person is competent (regulation 11E). The review records that decision." },
      { p: "The client (or whoever holds the client's duties) and the project owner can review. Choose Satisfied, or Need more information with a note saying what's missing. The app records who decided, when, and the fingerprint of the exact version reviewed. If more information is needed, the person updates their statement and submits a new version." },
    ],
  },
  {
    id: "report-change",
    title: "Reporting a change in competence",
    category: "Doing your tasks",
    summary: "If you stop meeting the competence requirements, you must say so (reg 11I).",
    body: [
      { p: "If something changes so you no longer meet the competence requirements for your work (for example your insurance lapses, or the person leading the work leaves), regulation 11I says you must tell whoever appointed you." },
      { p: "Use 'Report a change in your competence' at the bottom of Your tasks. It tells the project owner, records the report, and sends your competence statement back for review." },
    ],
  },
  {
    id: "uploads",
    title: "Uploading and withdrawing files",
    category: "Doing your tasks",
    summary: "Files are stored privately and fingerprinted. They're never deleted, only withdrawn.",
    body: [
      { p: "Uploads go straight to private storage that only the right people can open, through links that stop working after 60 seconds. The server works out each file's SHA-256 fingerprint when it arrives." },
      { p: "Files can't be changed or deleted. If you uploaded the wrong one, withdraw it with a reason: it disappears from your statement but stays on record, which is what an evidence trail needs." },
    ],
  },

  // Running a project ----------------------------------------------------------
  {
    id: "statuses",
    title: "Red, amber and green",
    category: "Running a project",
    summary: "Red: not started or needs info. Amber: in progress or awaiting review. Green: complete.",
    body: [
      { list: [
        "Red: not started, or sent back as needing more information.",
        "Amber: in progress, or submitted and waiting for someone to review or sign.",
        "Green: complete.",
      ] },
      { p: "The dashboard shows a dot for every person and duty, so you can see at a glance who's behind." },
    ],
  },
  {
    id: "reminders",
    title: "Reminders (chasing)",
    category: "Running a project",
    summary: "Polite automatic reminders on day 3, 7 and 14, then weekly, signed on the owner's behalf.",
    body: [
      { list: [
        "Day 3: a friendly nudge showing progress.",
        "Day 7: a reminder naming the construction start date, if set.",
        "Day 10: the owner gets a weekly digest of who's behind.",
        "Day 14, then weekly: a firm reminder, copying the owner.",
      ] },
      { p: "Reminders only go out on weekdays between 8am and 6pm UK time, at most one email per person per day, and never twice for the same step. Each is signed on the project owner's behalf and links straight to the person's tasks." },
      { p: "On the dashboard the owner can see when each person was last chased and when their next reminder is due, pause reminders for anyone they'd rather speak to, or 'Chase now' (once a day)." },
    ],
  },
  {
    id: "project-clock",
    title: "The project clock",
    category: "Running a project",
    summary: "All reminder timing uses the project's own clock, which demo projects fast-forward.",
    body: [
      { p: "For real projects the project clock is simply today's date. Demo projects run on their own clock, which moves forward a day at a time when you press Advance, so you can watch weeks of chasing in a minute." },
    ],
  },
  {
    id: "demo",
    title: "Demo mode",
    category: "Running a project",
    summary: "A fictional project that fast-forwards time to show chasing in action.",
    body: [
      { p: "Try a demo creates a fictional project with six people, each with a personality (one only replies after a second reminder, another is asked for more information once). Use Advance 1 day, Advance to next event or Play to fast-forward." },
      { p: "Demo emails are never sent: they appear in the Outbox so you can read exactly what each person would have received. The chart shows items being completed day by day." },
    ],
  },
  {
    id: "evidence-pack",
    title: "The evidence pack",
    category: "Running a project",
    summary: "A zip of every record, with an index listing each file's fingerprint.",
    body: [
      { p: "The project owner can export an evidence pack at any time. It contains the project summary, appointment letters with signature blocks, each person's competence statements and evidence, signed acknowledgements, notifications, the handover document and the full audit trail." },
      { p: "00_Index.pdf lists everything still outstanding and the SHA-256 fingerprint of every file. Evidence files are re-checked against the fingerprint recorded when they were uploaded, and any mismatch is flagged in red." },
      { p: "Packs can be downloaded by the owner, after two-factor, for 24 hours. Every download is logged." },
    ],
  },

  // Security and records ---------------------------------------------------------
  {
    id: "two-factor",
    title: "Two-factor login and recovery codes",
    category: "Security and records",
    summary: "Your password plus a 6-digit code from an authenticator app on your phone.",
    body: [
      { p: "Everyone uses two-factor login: your password, then a 6-digit code from an authenticator app such as Google Authenticator, Microsoft Authenticator or 1Password. The code changes every 30 seconds. Until you've entered it, you can't see any project information at all." },
      { p: "When you set it up you get 10 recovery codes. Keep them somewhere safe. If you lose your phone, sign in with your password, choose 'Lost your phone?', and enter one recovery code: each works once, and you'll then set up a new authenticator." },
      { p: "If your code is rejected, check your phone's clock is set automatically, and use the newest code. You're signed out after 12 hours of inactivity." },
    ],
  },
  {
    id: "fingerprints",
    title: "Fingerprints (SHA-256)",
    category: "Security and records",
    summary: "A 64-character code that changes completely if a single character of a file changes.",
    body: [
      { p: "A SHA-256 fingerprint is a 64-character code calculated from a file or a piece of text. The same content always gives the same code, but changing even one character gives a completely different one. Recording it means anyone can later prove a document hasn't been altered: recalculate the fingerprint and compare." },
      { p: "Dutyholder fingerprints every upload, the exact wording of every acknowledgement and letter you sign, each competence statement version, and every file in the evidence pack." },
      { p: "To check a file yourself on a Mac, open Terminal and run: shasum -a 256 followed by the file name. On Windows, in PowerShell: Get-FileHash followed by the file name." },
    ],
  },
  {
    id: "audit-trail",
    title: "The audit trail",
    category: "Security and records",
    summary: "A permanent, add-only record of everything that happens on a project.",
    body: [
      { p: "Every sign-up, invite, signature, upload, review, reminder, set-up change and download is recorded with who did it, when, and from which IP address. Entries can never be edited or deleted. The owner can export it as 99_Audit_Trail.csv in the evidence pack." },
    ],
  },
  {
    id: "privacy",
    title: "Privacy and who can see what",
    category: "Security and records",
    summary: "You see your own tasks; the team list is shared; the owner and client see competence records.",
    body: [
      { list: [
        "Everyone on a project can see the project details, the team list and the appointments.",
        "You see your own tasks and records. The project owner sees everyone's tasks.",
        "Submitted competence statements and evidence are visible to the project owner and to whoever reviews competence (usually the client).",
        "Nobody outside a project can see anything about it.",
      ] },
      { p: "Data is stored in the UK (London). Records are kept for the period agreed for each project (15 years after the project by default)." },
      { note: "This privacy summary is a draft and will be replaced by a full privacy notice before the app is used on a live project." },
    ],
  },
];

export type HelpTerm = { label: string; definition: string; topic: string };

// Short definitions for the ⓘ marks. Keep each to a sentence or two.
export const HELP_TERMS: Record<string, HelpTerm> = {
  "part-2a": { label: "Part 2A", topic: "part-2a",
    definition: "The part of the Building Regulations 2010 that sets out who is responsible for compliance and what each dutyholder must do (England, since October 2023)." },
  dutyholder: { label: "Dutyholder", topic: "roles",
    definition: "Anyone with legal duties under Part 2A: the client, designers and contractors, including the principal designer and principal contractor." },
  client: { label: "Client", topic: "roles",
    definition: "The person or organisation the building work is done for. Appoints the principals and checks their competence." },
  "domestic-client": { label: "Domestic client", topic: "domestic-client",
    definition: "A homeowner having work done on their own home. Their duties are carried out by the contractor side, or by the principal designer if agreed in writing." },
  "principal-designer": { label: "Principal designer", topic: "roles",
    definition: "Plans, manages, monitors and coordinates the design work, and makes sure designers cooperate and comply." },
  designer: { label: "Designer", topic: "roles",
    definition: "Anyone who prepares or modifies designs, such as architects and structural, fire or MEP engineers." },
  "principal-contractor": { label: "Principal contractor", topic: "roles",
    definition: "Plans, manages, monitors and coordinates the building work during the construction phase." },
  contractor: { label: "Contractor", topic: "roles", definition: "Anyone who carries out the building work." },
  "higher-risk": { label: "Higher-risk building work", topic: "higher-risk",
    definition: "Broadly, buildings at least 18m or 7 storeys with 2+ homes, or hospitals and care homes. Needs extra steps; not supported in this version." },
  contractors: { label: "More than one contractor", topic: "principal-appointments",
    definition: "With more than one contractor, the client must appoint a principal designer and principal contractor in writing. With one, the designers agree a lead designer instead." },
  cdm: { label: "CDM 2015 certification", topic: "cdm",
    definition: "The client can certify that the CDM 2015 principal designer is also the Building Regulations principal designer (reg 11D(2))." },
  "lead-designer": { label: "Lead designer", topic: "principal-appointments",
    definition: "With only one contractor, the designers agree in writing which of them leads and coordinates the design." },
  appointments: { label: "Appointments", topic: "principal-appointments",
    definition: "Written appointments of the principal designer and principal contractor (reg 11D), signed by the client and the person appointed." },
  appointer: { label: "Appointer", topic: "principal-appointments",
    definition: "The person appointing someone: normally the client, or whoever carries out a domestic client's duties." },
  void: { label: "Void", topic: "principal-appointments",
    definition: "Cancelling an issued letter with a reason. It stays on record, and a corrected one can be issued." },
  firm: { label: "Held by a firm", topic: "firms",
    definition: "The role is held by a company rather than a person, so it also describes its organisational capability." },
  competence: { label: "Competence", topic: "competence",
    definition: "Having the skills, knowledge, experience and behaviours (or, for a firm, organisational capability) for the work (reg 11F)." },
  behaviours: { label: "Behaviours", topic: "competence",
    definition: "Refusing work that wouldn't comply, cooperating with others, and not taking on work beyond your competence (reg 11Q(4))." },
  "organisational-capability": { label: "Organisational capability", topic: "firms",
    definition: "A firm's systems, people and resources to carry out the work in compliance." },
  review: { label: "Competence review", topic: "reviews",
    definition: "The appointer's record of having taken reasonable steps to be satisfied someone is competent (reg 11E)." },
  "typed-signature": { label: "Typed-name signature", topic: "signatures",
    definition: "You tick a statement and type your full name. The app records your name, the time, your IP address and a fingerprint of the wording." },
  sha256: { label: "SHA-256 fingerprint", topic: "fingerprints",
    definition: "A 64-character code calculated from a file or text. If even one character changes, the code changes completely, so it proves nothing was altered." },
  "two-factor": { label: "Two-factor login", topic: "two-factor",
    definition: "Your password plus a 6-digit code from an authenticator app on your phone." },
  "recovery-codes": { label: "Recovery codes", topic: "two-factor",
    definition: "Ten one-time codes that let you back in if you lose your phone. Keep them somewhere safe." },
  "building-control": { label: "Building control notification", topic: "notifications",
    definition: "The building control body must be told of principal appointments within 14 days (reg 11O)." },
  handover: { label: "Handover document", topic: "notifications",
    definition: "Within 28 days of their appointment ending, the principal designer explains to the client the arrangements they made (reg 11M(5)(b))." },
  rag: { label: "Red, amber, green", topic: "statuses",
    definition: "Red: not started or needs info. Amber: in progress or awaiting review. Green: complete." },
  reminders: { label: "Reminders", topic: "reminders",
    definition: "Automatic, polite emails on day 3, 7 and 14, then weekly. Weekdays 8am–6pm only, one per person per day." },
  withdrawn: { label: "Withdrawn", topic: "uploads",
    definition: "A file taken out of use with a reason. It is never deleted, so the record stays complete." },
  "evidence-pack": { label: "Evidence pack", topic: "evidence-pack",
    definition: "A zip of every record on the project, with an index listing each file's fingerprint." },
  "audit-trail": { label: "Audit trail", topic: "audit-trail",
    definition: "A permanent record of everything that happened: who, what, when and from where. It can't be edited." },
  "project-clock": { label: "Project clock", topic: "project-clock",
    definition: "The date reminders are timed from. For demo projects it moves forward when you advance the demo." },
  outbox: { label: "Outbox", topic: "demo",
    definition: "Where demo emails appear instead of being sent." },
  "report-change": { label: "Report a change", topic: "report-change",
    definition: "Telling the team you no longer meet the competence requirements for your work (reg 11I)." },
};

export const HELP_CATEGORIES = [...new Set(HELP_TOPICS.map((t) => t.category))];
