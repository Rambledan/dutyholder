# Dutyholder Appointment Tool — Prototype Build Plan

Oct 31, 2026 · @Dan

## Summary

Build a secure web app where a principal designer sets up a real project, invites each dutyholder, and gets every appointment, duty acknowledgement and competence record signed off and filed in one place.

The prototype must prove four things on one live project:

1. **The right questions reach the right people.** Each role (client, principal designer, designer, principal contractor, contractor) sees only the duties that apply to them under Part 2A.
2. **It chases until everything is green.** Automatic reminders, then escalation, until every item is done. A demo mode fast-forwards time to show this in two minutes.
3. **It produces the evidence.** A tidy, secure folder of signed appointments, competence records and an audit trail, exportable as a zip.
4. **AI helps scope the job.** An assistant reads the project description and suggests which parts of the Building Regulations are likely to apply, for a human to confirm.

Stack: Next.js on Vercel, Supabase (database, login, file storage), Resend for email, the Claude API for the AI step. England only for v1.

This is a working plan, not legal advice. Your friend should sanity-check the duty wording, and ideally a construction lawyer should review the appointment templates before real signatures go on them.

## The regulatory backbone (what the tool must capture)

The checklist content comes from [Part 2A of the Building Regulations 2010](https://www.legislation.gov.uk/uksi/2010/2214/part/2A), regulations 11A to 11Q, in force in England since 1 October 2023. The table below is the source for the seed data in the app: one row becomes one or more checklist items.

| Who | What the law asks | Reg | What the tool collects |
| --- | --- | --- | --- |
| Client | Make suitable arrangements to plan, manage and monitor the project, with enough time and resources | 11A(1)-(3) | Signed acknowledgement; programme and resource note |
| Client | Give building information to every designer and contractor as soon as practicable | 11A(4) | Upload of building information; log of who received it |
| Client | Where more than one contractor is foreseeable, appoint a principal designer and principal contractor in writing | 11D(1) | Generated appointment letter, e-signed by client and appointee |
| Client | Appoint before the construction phase (or before the Gateway 2 application for higher-risk work) | 11D(3) | Appointment date checked against start date |
| Client | Take reasonable steps to check the principal designer's and principal contractor's competence | 11E(4)-(5) | Client's review decision on each competence pack |
| Anyone engaging a designer or contractor | Check competence before work starts; for higher-risk buildings, ask about serious sanctions in the last 5 years | 11E(2) | Competence pack + sanctions declaration + reviewer sign-off |
| Every designer and contractor | Have the skills, knowledge, experience and behaviours (individuals) or organisational capability (firms) | 11F | Competence statement in four parts, plus evidence uploads |
| Principal designer (if a firm) | Designate a named individual to manage the role | 11G(2)-(3) | Named individual + their own competence statement |
| Anyone who stops being competent | Notify the client or principal | 11I | "Report a change" button that notifies the right person |
| All dutyholders | Plan, manage and monitor own work; cooperate with everyone else | 11J | Signed acknowledgement |
| Designers | Confirm the client knows their duties before starting; flag compliance concerns on related design to the principal designer | 11K | Acknowledgement + "raise a concern" form |
| Contractors | Same idea, flagging to the principal contractor | 11L | Acknowledgement + "raise a concern" form |
| Principal designer | Plan, manage, monitor and coordinate design; make designers cooperate and comply; liaise with the principal contractor | 11M(1)-(4) | Acknowledgement; design responsibility matrix |
| Principal designer | Within 28 days of the appointment ending, give the client a document explaining their arrangements | 11M(5)(b) | Auto-drafted handover report with a 28-day deadline |
| Client (or PD for a domestic client) | Notify the building control body of new principal appointments within 14 days (not higher-risk work) | 11O | Pre-filled notification with a 14-day countdown |

Three rules shape how the app branches:

- **Domestic clients** (homeowners): their duties pass to the contractor or, if agreed in writing, the principal designer (11C). The app should ask "Is the client a domestic client?" at project setup and reassign items.
- **One contractor only**: that contractor is automatically the principal contractor, and designers must agree in writing who is lead designer (11D(6)-(7)). The app generates that agreement.
- **CDM overlap**: the client can certify that the CDM 2015 principal designer is also the Building Regulations principal designer (11D(2)). Offer this as a tick-box on the appointment.

The law defines the "behaviours" part of competence quite specifically: refusing non-compliant work, cooperating, and refusing work beyond your skills (11Q(4)). Use those three as prompts in the competence form, not a blank text box.

Two context points as of October 2026:

- The Building Safety Regulator left the HSE and became [a standalone body on 27 January 2026](https://www.gov.uk/government/news/bsr-becomes-standalone-body-in-landmark-step-towards-single-construction-regulator). Use "Building Safety Regulator" in copy, never "HSE".
- Wales brought in [its own, largely mirrored dutyholder regime (Part 2B) from 1 July 2026](https://localgovernmentlawyer.co.uk/projects-and-regeneration/317-projects-features/99392-changes-to-the-building-safety-regime-in-wales). Store a `jurisdiction` field on every project now, even if only England is built.

## Challenges to resolve before building

The idea is sound, but six assumptions in the brief need correcting or testing first.

1. **The principal designer doesn't appoint the team; the client does.** The client appoints the principal designer and contractor (11D). Whoever engages each designer must check their competence (11E). The principal designer's legal job is to coordinate and make sure designers comply (11M). So the tool should let your friend *run* the process, but the client must be the one who signs the appointments. Design the roles around that, or the paper trail is wrong.
2. **"I agree" is not competence.** A self-declaration alone is weak. The law asks the appointing person to take "reasonable steps to satisfy themself". The valuable thing the tool can do is record the *reviewer's decision* on evidence (qualifications, memberships, insurance, comparable projects), with who reviewed it and when.
3. **"Principal architect" is not a legal role.** Use the statutory names everywhere: client, principal designer, designer, principal contractor, contractor. Your friend's title is irrelevant; the role on this project is what counts.
4. **Contractors are part of this too.** Your brief lists designers only. Part 2A applies equally to the principal contractor and contractors. Include them from day one, even if the first project only invites them later.
5. **Higher-risk buildings change everything.** Buildings at least 18m or 7 storeys with 2+ homes (or hospitals and care homes) need extra records and a Gateway 2 application to the regulator. Ask at setup and refuse to proceed on higher-risk work in v1, rather than half-supporting it.
6. **Chasing people is a relationship risk.** Engineers will hate nagging from a robot on behalf of a peer. Make reminders polite, sent "on behalf of" your friend, capped in frequency, and let your friend preview or pause them.

The question to answer with your friend before writing code: **what does the evidence pack need to look like for a building control officer to accept it?** Get an example from a recent project and design backwards from it.

## Users, roles and core journeys

One person can be a user on many projects, with a different role on each. That's why "role" lives on the project membership, not on the user.

| Role on a project | Can do | Sees |
| --- | --- | --- |
| Project owner (your friend, usually the principal designer) | Create project, invite people, review competence, pause chasing, export pack | Everything on that project |
| Client | Sign appointments, review PD/PC competence, upload building information | Their own items + appointment status |
| Designer (structural, fire, MEP, civil) | Acknowledge duties, submit competence, raise concerns | Their own items + who else is on the team |
| Principal contractor / contractor | Same as designer, contractor-side duties | Their own items + team list |
| Viewer (e.g. building control officer, later) | Read-only access to the final pack | The exported pack only |

The four journeys the prototype must make smooth:

1. **Set up a project (owner, \~10 min).** Name, address, description, jurisdiction, domestic client yes/no, higher-risk yes/no, expected number of contractors. The AI step suggests applicable regulations here. Then add team members by email and role.
2. **Respond to an invite (dutyholder, \~15 min).** Click the email link, create a password, set up two-factor on their phone, see a short list of "things to do", tick acknowledgements, fill the competence form, upload evidence, done. Their progress saves as they go.
3. **Review and approve (client or owner).** Open a competence pack, read it, mark "satisfied" or "need more info" with a note. That decision is the legally useful record.
4. **Watch it turn green (owner).** A dashboard grid of people × items, red/amber/green, with "last chased" dates. Export the pack when it's all green.

Design principle: a dutyholder should never need to log in more than twice. Most of what they do should be completable in one sitting from the first email.

## Tech stack, explained

Vercel plus Supabase is a good choice: it gives you login, a database, file storage and scheduled jobs without running any servers yourself.

| Piece | What it is, in plain English | Why this one |
| --- | --- | --- |
| **Next.js** (App Router, TypeScript) | The framework for the website. It does both the pages people see and the small bits of server code behind them. | Vercel's home turf; Claude Code is very fluent in it |
| **Vercel** | The hosting. Push code to GitHub, Vercel builds and publishes it. Every branch gets its own preview link. | Zero server admin; preview links are great for showing your friend changes |
| **Supabase Postgres** | The database: tables of projects, people, checklist items and so on. | Real SQL database with strong access rules built in |
| **Supabase Auth** | Login. Handles passwords, email links and two-factor codes. | Has built-in two-factor (authenticator app) support |
| **Row Level Security (RLS)** | Rules *inside* the database saying "a user can only read rows for projects they belong to". | Even a bug in your website can't leak another project's data |
| **Supabase Storage** | Private file storage for PDFs and evidence uploads. | Same access rules as the database; files served via short-lived links |
| **Vercel Cron** | A timer that calls a web address on a schedule, e.g. every hour. | Runs the chasing engine without a separate server |
| **Resend** | Sends emails from your app (invites, reminders). | Simple API, good deliverability, React email templates |
| **Claude API** | The AI that reads the project description. | Called only from server code, so your API key is never in the browser |
| **shadcn/ui + Tailwind** | Ready-made, accessible buttons, forms and tables. | Looks clean with no designer; easy for Claude Code to use |

Key concepts you'll meet in Claude Code:

- **Environment variables** are secrets (API keys) stored in Vercel and on your laptop in a `.env.local` file, never committed to GitHub.
- **Migrations** are numbered SQL files that create or change tables. Each change to the database is a new migration, so you can rebuild it from scratch anywhere.
- **Server actions / API routes** are the server-side code. Anything secret (Claude API key, Supabase service key, Resend key) only ever runs here.
- **Two Supabase projects:** one for development, one for the real project. Never test on the live one.

Choose Supabase's **London region (eu-west-2)** when creating the project, so personal data stays in the UK.

How the pieces connect:

&#91;embedded content: System architecture · browser, Vercel, Supabase, email and AI\]

The browser only ever talks to your Next.js code; that code talks to Supabase, Resend and Claude, and the database rules (highlighted) are the final lock on every read.

## Data model

The core idea: **duty templates** are the master list of everything the law asks of each role; **checklist items** are copies of those templates handed to a specific person on a specific project. Think of templates as the recipe and items as the dishes served.

| Table | Holds | Key fields |
| --- | --- | --- |
| `profiles` | One row per person who has logged in | name, company, phone, linked to the Supabase login |
| `projects` | One row per building project | name, address, description, jurisdiction, is\_domestic\_client, is\_higher\_risk, expected\_contractors, status |
| `project_members` | Who is on which project, in which role | project, person (or just an email until they accept), role, discipline (structural, fire, MEP, civil), is\_firm, chasing\_paused |
| `duty_templates` | The master checklist, seeded from the regulatory table above | code (e.g. `PD-11M-1`), role, title, plain-English explanation, legal reference, item type (acknowledge, upload, form, sign, review), conditions, version |
| `checklist_items` | One task for one person on one project | project, member, template, status, due date, completed date, answer |
| `competence_statements` | The four-part competence answer | member, skills, knowledge, experience, behaviours, organisational capability (firms), sanctions declaration, version |
| `reviews` | Someone's decision on a submission | what was reviewed, reviewer, decision (satisfied / need more info), note, timestamp |
| `appointments` | Formal written appointments | appointee, role, letter template version, PDF, client signed at, appointee signed at |
| `documents` | Every uploaded or generated file | project, owner, storage path, file name, SHA-256 fingerprint, type |
| `reminders` | Every chase that was sent | item, person, step in the sequence, sent at, simulated yes/no |
| `audit_log` | Append-only record of everything that happened | who, what, when, which record, IP address |

Three design choices worth explaining:

- **Statuses are a fixed list** (not\_started, in\_progress, submitted, needs\_info, complete), stored as a Postgres "enum". This drives the red/amber/green grid: red = not started or needs info, amber = in progress or submitted awaiting review, green = complete.
- **Templates are versioned.** If you later reword a duty, old projects keep the wording people actually signed. Never edit a template row in place; add a new version.
- **The audit log can only be added to**, never edited or deleted. A database rule enforces this. It's your evidence that the process happened as claimed.

Template "conditions" let the app decide who gets what, e.g. `{"is_domestic_client": true}` moves client duties to the principal designer or contractor. A function called `generate_checklist(project_id)` reads the project answers and creates the right items for every member. Re-run it whenever someone is added or a setup answer changes.

## Security and data protection

Security rests on three locks: two-factor login, database rules that check two-factor was used, and private file storage. Build all three in phase 1, not at the end.

**Two-factor authentication (2FA)**

- Use Supabase Auth's built-in **authenticator-app (TOTP)** factor: the user scans a QR code with Google Authenticator, Microsoft Authenticator or 1Password, then types a 6-digit code at each login.
- Avoid "email code" as the second factor. If someone's email is hacked, both factors fall together.
- Supabase marks a session as **`aal2`** ("authenticator assurance level 2") once the code is entered. Every database rule checks for `aal2`, so a half-logged-in user sees nothing.
- Give each user **recovery codes** at setup, and let the project owner reset someone's 2FA after a phone call (logged in the audit trail).

**Access rules (RLS)**

- Turn on Row Level Security on every table. Default is "deny everything"; then add rules like "members can read items on their own projects".
- Ask Claude Code to write **automated tests** that log in as user A and try to read user B's project. These must fail. Run them on every change.
- The Supabase "service role" key bypasses all rules. Use it only in the chasing job and the export job, never in a page.

**Files**

- One **private** storage bucket. Files are opened via signed links that expire after 60 seconds.
- Limit uploads to PDF, images and Word/Excel, max 20 MB each.
- Store a SHA-256 fingerprint of every file. If anyone later disputes a document, you can prove it hasn't changed.

**Invites and sessions**

- Invite links are single-use and expire after 7 days.
- Sessions time out after 12 hours of inactivity.

**Signatures**

- Use a simple electronic signature: the user types their full name, ticks a statement, and the app records name, time, IP address and the document's fingerprint, then stamps a signature block onto the PDF. This is generally accepted for contracts in England, but have a lawyer confirm for the appointment letters. DocuSign can come later.

**UK GDPR basics** (competence statements are personal data)

- Supabase in the London region; check that Vercel, Resend and Anthropic each have a data processing agreement you accept.
- A short privacy notice shown at sign-up: what's collected, why, who sees it, how long it's kept.
- Don't send names or competence details to the AI; it only needs the project description.
- Agree a retention period with your friend (e.g. project end + 15 years, typical for professional liability), and record it on the project.

**Not optional for a live project:** use a paid Supabase plan with automatic backups, and a separate development project for testing. Free projects can be paused when inactive and have no point-in-time restore.

## Chasing engine and the time-simulation demo

One piece of code decides who to chase and when; the real project and the demo both run it. The only difference is where it gets "today's date" from. That way the demo genuinely proves the real engine works.

**How it runs.** Vercel Cron calls `/api/cron/chase` once an hour, with a secret key so nobody else can trigger it. The job looks at every open checklist item, works out which step of the sequence each person is at, and sends at most **one digest email per person per day** listing everything they still owe. Every send is written to the `reminders` table, so if the job runs twice nothing is sent twice.

**Suggested default sequence** (editable per project):

| Day after invite | Who gets it | Tone |
| --- | --- | --- |
| 0 | Dutyholder | Invite: what this is, why it's a legal duty, about 15 minutes to complete |
| 3 | Dutyholder | Friendly nudge with a progress bar ("2 of 5 done") |
| 7 | Dutyholder | Reminder naming the project start date |
| 10 | Project owner | "These 3 people are behind" digest, with one-click "chase again" or "call them" |
| 14 | Dutyholder, copying whoever appointed them | Firm: their appointer must check competence before letting work start (11E) |

Legal-deadline items get their own countdowns: the 14-day building control notification (11O) and the 28-day principal designer handover document (11M(5)(b)).

Rules that keep it polite: no emails at weekends or outside 8am to 6pm UK time; the owner can pause chasing for any person; every email is signed "on behalf of \[owner name\]"; one click in the email takes the person straight to their next task, after 2FA.

**The simulation (demo mode)**

- Every project has an `is_demo` flag and a `clock_offset_days` number. A helper function `projectNow(project)` returns real time for live projects and real time + offset for demos. All chasing code calls this helper, never the system clock directly.
- A demo project is seeded with five fictional people: client, structural engineer, fire engineer, MEP engineer, principal contractor. Each has a scripted "personality", e.g. the fire engineer only responds after the second reminder; the MEP engineer submits but needs more info once.
- Demo emails are not really sent. They appear in an in-app **Outbox** panel so you can show exactly what each person would have received.
- A control bar with **"Advance 1 day"**, **"Advance to next event"** and **"Play"** (one simulated day per second). As the clock moves, the grid turns from red to amber to green and a line chart shows "items complete" climbing over time.
- When everything is green, the demo generates the evidence pack, so the story ends with the deliverable.

This gives your friend a two-minute demo for clients and peers, while the real project runs on the same engine in real time.

## Document vault and evidence pack

Every project gets a fixed folder structure in private storage, and a one-click export that zips it with an index and the audit trail.

```
/<project-ref>/
  00_Index.pdf                      contents, RAG status, generated date
  01_Project/                       description, AI regulations summary (as confirmed)
  02_Appointments/                  signed PD and PC appointment letters, lead designer agreement, CDM certification
  03_Competence/<person>/           competence statement PDF, evidence uploads, reviewer decision
  04_Duty_Acknowledgements/<person>/ signed acknowledgement per role
  05_Notifications/                 building control notices (11O), change-of-competence notices (11I)
  06_Concerns/                      design/compliance concerns raised and responses
  07_Handover/                      principal designer handover document (11M(5)(b))
  99_Audit_Trail.csv                every action, who, when, IP, file fingerprints
```

How it works:

- PDFs are generated on the server from the database (a library such as `@react-pdf/renderer`), so a competence statement always looks the same and carries a footer with the person, timestamp and fingerprint.
- The export runs as a background job and emails the owner a download link that expires after 24 hours.
- Folder access follows project roles: a designer can see their own folder and the appointments list; only the owner and client see everything.
- Deleting a file never truly deletes it during the project. It is marked "withdrawn" and kept, with the reason logged.

## AI regulations advisor

The AI suggests; a human confirms. Its output is a starting checklist your friend edits, never a compliance decision, and the app should say so on screen.

**What it does.** At project setup, the owner pastes or writes the project description (building type, use, storeys, height, new build or alteration, residential units, location). The app sends that to the Claude API and gets back a structured list:

- Which Schedule 1 requirements are likely engaged, e.g. Part A (structure), B (fire safety), L (energy), M (access), O (overheating), each with a confidence level and a one-line reason.
- Flags: possibly higher-risk building, domestic client, CDM 2015 likely to apply, more than one contractor foreseeable.
- **Questions it couldn't answer** ("Height to top storey not stated; needed to rule out higher-risk"). These are often the most useful part.
- Suggested disciplines for the team: e.g. "Part B engaged → add a fire engineer".

**How to build it so it's trustworthy**

1. **Ground it.** Don't rely on what the model remembers. Write a short reference file (`/reference/approved-documents.md`) summarising each Approved Document and when it applies, dated and with links to gov.uk. Send it with every request. Regulations change (several 2026 amendments to Part L are listed on legislation.gov.uk), so the reference file is what you update, not the code.
2. **Force structured output.** Ask for JSON in a fixed shape and validate it with a schema (the `zod` library). If it doesn't validate, show an error rather than half an answer.
3. **Record everything.** Save the input, output, model name and prompt version in the audit log, so you can later show what was suggested and what the human changed.
4. **Make confirmation a real step.** Each suggestion has Accept / Reject / Edit. Only accepted items flow into checklist conditions and team suggestions.
5. **Server-side only.** The Claude API key lives in Vercel environment variables. Only the project description is sent, not anyone's personal data.

Use a mid-tier model (e.g. `claude-sonnet-5-5`); it's plenty for this and cheap per project. Build a small test set of 5 to 10 real past project descriptions with your friend's "correct answer", and re-run them whenever you change the prompt.

## Build phases

Ten phases, each ending in something you can click. Do them in order: security first, then the dutyholder experience, then chasing, then the demo and AI. Paste each prompt into Claude Code once the previous phase's "done when" is true.

1. **Phase 0 — Set-up (you, \~1 hour).** Create: a GitHub repo, two Supabase projects in London region (`dutyholder-dev`, `dutyholder-prod`), a Vercel project linked to the repo, a Resend account with your sending domain verified, an Anthropic API key. Put this plan in the repo as `PLAN.md` and add the `CLAUDE.md` below.
2. **Phase 1 — Skeleton, login and 2FA.**
   - Prompt: *"Read PLAN.md and CLAUDE.md. Scaffold a Next.js App Router + TypeScript + Tailwind + shadcn/ui app using Supabase Auth via @supabase/ssr. Implement sign-up from an invite link, email+password login, mandatory TOTP 2FA enrolment with recovery codes, and middleware that blocks every page unless the session is aal2. Create a profiles table with RLS. Explain each file you create in plain English."*
   - Done when: you can sign up, scan a QR code, log out, and get blocked without the code.
3. **Phase 2 — Projects, roles and the checklist engine.**
   - Prompt: *"Create migrations for projects, project\_members, duty\_templates and checklist\_items as described in PLAN.md, with RLS that requires aal2 and project membership. Seed duty\_templates from the regulatory table in PLAN.md, one row per duty, with legal references. Write generate\_checklist(project\_id) that applies template conditions (domestic client, single contractor, CDM certification). Add automated tests proving user A can't read user B's project."*
   - Done when: creating a test project with five members produces the right items for each role, and the cross-project test fails to read anything.
4. **Phase 3 — The dutyholder experience.**
   - Prompt: *"Build the invite email (Resend) and the dutyholder flow: a 'Your tasks' page with progress, acknowledgement items with a typed-name signature, a four-part competence form (skills, knowledge, experience, behaviours, with organisational capability for firms and a serious-sanctions question for higher-risk projects), evidence uploads to a private Supabase bucket with SHA-256 fingerprints, and autosave. Mobile-friendly. Log every action to an append-only audit\_log."*
   - Done when: a colleague can complete everything from the invite email on their phone in under 15 minutes.
5. **Phase 4 — Review and appointments.**
   - Prompt: *"Add a review screen where the client or owner marks a competence submission 'satisfied' or 'needs more info' with a note. Generate PDF appointment letters for principal designer and principal contractor, the lead designer agreement, and the CDM certification option, with e-signature capture by both parties."*
6. **Phase 5 — Dashboard and chasing.**
   - Prompt: *"Build the owner dashboard: a people × items grid with red/amber/green and last-chased dates. Implement the chasing engine from PLAN.md as a Vercel Cron route protected by CRON\_SECRET, using a projectNow(project) clock helper, one digest per person per day, quiet hours, pause per person, and idempotent sends recorded in a reminders table."*
   - Done when: shifting a test item's dates back a week causes the right reminder on the next cron run, once only.
7. **Phase 6 — Demo mode.**
   - Prompt: *"Add demo projects using is\_demo and clock\_offset\_days. Seed five fictional dutyholders with scripted response behaviours. Add an in-app Outbox instead of real email for demo projects, controls for Advance 1 day / next event / Play, and a line chart of items complete over simulated days."*
8. **Phase 7 — Evidence pack.**
   - Prompt: *"Generate PDFs for competence statements and acknowledgements, and build the export: the folder structure in PLAN.md zipped with 00\_Index.pdf and 99\_Audit\_Trail.csv, delivered by an expiring download link."*
9. **Phase 8 — AI regulations advisor.**
   - Prompt: *"Add a server action that sends the project description plus /reference/approved-documents.md to the Claude API, requests JSON validated by a zod schema, and shows suggestions with Accept/Reject/Edit. Accepted items update project conditions and suggested disciplines. Log input, output, model and prompt version."*
10. **Phase 9 — Go live with the real project.** Run the security checklist (below), turn on backups, publish the privacy notice, walk your friend through it, invite one friendly engineer first, then everyone.

Pre-launch security checklist:

- [ ] RLS on for every table; cross-project tests pass
- [ ] Every page and API route requires aal2
- [ ] Service role key used only in cron and export jobs
- [ ] Storage bucket private; signed links expire
- [ ] Secrets only in Vercel env vars, none in GitHub
- [ ] Paid Supabase plan with backups on the production project
- [ ] Privacy notice and retention period agreed
- [ ] Appointment letter wording reviewed by your friend (and ideally a lawyer)

## Working with Claude Code

Export this doc as Markdown and save it as `PLAN.md` in the repo. Then create `CLAUDE.md`: Claude Code reads it automatically at the start of every session, so it's where standing rules go.

```markdown
# CLAUDE.md

## What this is
A secure web app for managing Building Regulations Part 2A dutyholder
appointments, duty acknowledgements and competence evidence (England).
Full plan: PLAN.md. Follow its phases in order.

## Stack
Next.js App Router, TypeScript, Tailwind, shadcn/ui, Supabase (Postgres,
Auth with TOTP MFA, Storage), Resend, Vercel Cron, Claude API.

## Non-negotiable rules
- Every table has RLS enabled. Every policy requires aal2 and project membership.
- Never use the Supabase service role key in client components or pages.
- Secrets only via environment variables. Never commit .env files.
- All database changes are new migration files. Never edit an applied migration.
- audit_log is append-only. Log every create, update, sign, upload and send.
- All "now" logic for chasing goes through projectNow(project).
- Use the statutory role names: client, principal designer, designer,
  principal contractor, contractor.
- Write tests for access rules alongside every new table.

## How to work with me
I'm a beginner. Before big changes, explain the plan in plain English.
After each change, tell me what to click to test it.
Work one phase at a time and stop at its "done when" check.
```

Tips for vibe coding this safely:

- **Commit after every working step.** Ask Claude Code to "commit with a clear message" whenever something works. If a later change breaks it, you can roll back.
- **Use plan mode for each phase.** Ask it to plan first, read the plan, then say go. It catches misunderstandings before code is written.
- **Ask "why" freely.** "Explain what this RLS policy allows, in one sentence" is a good habit; access rules are where real bugs hide.
- **Test on Vercel preview links** with your friend before merging to the main branch, which is what the live project uses.
- **Never paste real competence data into chats** while debugging. Use the demo project's fictional people.

## Future direction and open questions

A reusable **competence passport** is probably a stronger next step than a marketplace. Every engineer fills in the same competence statement on every project; letting them keep a verified, versioned profile and share it in one click solves a real, repeated pain. It also builds the supply side a marketplace would later need.

Why to be cautious about the marketplace leap: two-sided marketplaces need lots of both sides before either gets value, and clients choosing a principal designer lean heavily on referrals and track record. Prove the passport and the process tool on 5 to 10 projects first, and do a competitor scan of existing Building Safety Act compliance tools before committing.

Cheap choices now that keep both doors open:

- Keep competence statements attached to the **person**, versioned, and *linked* to projects rather than copied into them.
- Add an `organisations` table now, so firms (not just individuals) can hold capability evidence.
- Keep `jurisdiction` on projects so Wales (Part 2B) can be added later.

Questions to settle with your friend before Phase 2:

- [ ] On the first real project, who is the client, and are they a domestic client?
- [ ] Is any part of it higher-risk building work? (If yes, v1 isn't ready for it.)
- [ ] Is your friend also the CDM principal designer, and should one appointment cover both?
- [ ] What evidence does your friend currently accept as proof of competence for each discipline?
- [ ] Can we get a past evidence pack or building control request to design the export against?
- [ ] Who signs appointments on the client side, and will they tolerate 2FA?
- [ ] What reminder tone and frequency would your friend be comfortable sending to peers?
- [ ] How long must records be kept, and who owns them if the appointment ends?

**Sources**

- [The Building Regulations 2010, Part 2A (legislation.gov.uk)](https://www.legislation.gov.uk/uksi/2010/2214/part/2A)
- [BSR becomes standalone body (gov.uk, 27 January 2026)](https://www.gov.uk/government/news/bsr-becomes-standalone-body-in-landmark-step-towards-single-construction-regulator)
- [Changes to the building safety regime in Wales (Local Government Lawyer)](https://localgovernmentlawyer.co.uk/projects-and-regeneration/317-projects-features/99392-changes-to-the-building-safety-regime-in-wales)
