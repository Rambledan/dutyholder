# Dutyholder — Design and Build Compliance Workspace — Build Plan

Oct 31, 2026 · @Dan · updated 6 Nov 2026

> **Decisions, 6 Nov 2026** (these override anything below that disagrees):
>
> - The product name stays **Dutyholder**.
> - **Demo mode stays switched off** (`DEMO_ENABLED = false`). Its code is kept, but nothing new depends on it, and no marketing uses it.
> - **Stop before the pilot.** No AI fact extraction, no pilot sign-up form, nothing that opens the product to the public. The landing page keeps "Sign in" as its call to action.
> - Phases 1–7 are built. The remaining prototype work is Phases 8–11 in "Build phases" below.

## Summary

We're building a secure, shared workspace where the client, principal designer, designers and contractors run the Building Regulations compliance process together, from appointment to completion. It started as a dutyholder sign-off checklist. With the Relevant Requirements Tracker and the statutory deadlines added, it's now a process collaboration tool for design and build teams, with the principal designer at the centre.

The prototype must prove five things on Ian's live project:

1. **The right questions reach the right people.** Each dutyholder sees only the Part 2A duties for their role, and signs appointments and competence statements.
2. **Every relevant requirement has an owner and an answer.** The tracker is built in. Designers write project-specific answers for their own area.
3. **It chases until everything is green.** Digest reminders and escalation, with a demo mode that fast-forwards time.
4. **No statutory deadline is missed.** The 14-day, 28-day and 5-day clocks start from their trigger events.
5. **The evidence is ready.** A secure vault and a one-click evidence pack with a full audit trail.

AI helps scope the job (facts, suggested relevance, not-relevant reasons) but never writes design answers.

Stack: Next.js on Vercel, Supabase (database, login, file storage), Resend for email, the Claude API. England only, non-higher-risk projects only, for v1.

Marketing and landing page messaging for this positioning: Communications Briefing — Product Positioning and Landing Page.

This is a working plan, not legal advice. Ian should check the duty wording, and a construction lawyer should review the appointment and statement templates before real signatures go on them.

## Product shape

Six modules sit on one shared project core and cover the project from appointment to completion. Every module reads the same team, roles and audit trail, which is what makes this one product rather than six tools.

[Diagram in the original doc: Product modules across the project lifecycle · 6 modules, 4 phases\]

The tracker is what turns a sign-off checklist into a tool the team uses all through design and construction, not just at the start.

What ships when:

| Release | Who uses it | Adds | Done when |
| --- | --- | --- | --- |
| **Prototype** (now) | Ian, on one live project | Build phases 1–11: login and 2FA, appointments and competence, chasing, evidence pack (1–7, built); statutory deadlines (8); role briefings and concerns (9); the tracker (10); videos and landing page (11) | Ian's project is fully green and the evidence pack has gone to building control |
| **Pilot** (not yet) | 5–10 principal designers, one non-higher-risk project each | AI fact extraction and relevance, stock text and prompts, importing existing trackers, demo mode, the pilot sign-up from the landing page | Each pilot finishes a project end to end; quotes and time saved collected |
| **v1 (paid)** | Principal designers and small practices | Firm accounts (organisations), billing, a fuller construction-phase view for principal contractors, branded outputs | First paying practices; pricing model confirmed |
| **Later** | — | Higher-risk buildings (Gateway 2 and 3), Wales (Part 2B), the competence passport, then the marketplace | Each judged against pilot demand, not built on spec |

The build phases below deliver the prototype row. The pilot row waits until we decide to open the product up.

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

## The principal designer role: briefing screen

Before the checklist, every principal designer sees a one-page **role briefing**: a short plain-English introduction, then the "must do" duties of regulation 11M in the law's own words. They tick "I have read and understood my duties", which becomes the first signed acknowledgement on their list. This follows section 4.5 of the [BCO Technical Note: Building Safety Act (September 2026)](https://www.bco.org.uk) that Ian shared.

**Copyright: use the regulation's wording, not the BCO's.** The BCO note is "all rights reserved" and can't be reproduced without the BCO's written permission. The 11M wording it quotes comes from the regulations, which are Crown copyright under the Open Government Licence and free to reuse. So the screen below uses the statutory text from [legislation.gov.uk](https://www.legislation.gov.uk/uksi/2010/2214/part/2A) plus our own introduction, and links to the BCO note as further reading. If Ian wants the BCO's own explanation on screen, he'll need to ask the BCO first.

### Draft introduction (our wording)

> **Your role as Building Regulations principal designer**
>
> The client has appointed you, in writing, as the designer in control of the design work for this project. You may be an individual or a firm, such as an architect, engineer or surveyor. The role is required whenever more than one contractor is, or is likely to be, working on the project, not just on higher-risk buildings. It is separate from the CDM principal designer, although the same person can hold both roles if competent.
>
> You don't need to be an expert in every discipline. You do need enough knowledge of the Building Regulations to plan, manage, monitor and coordinate the design so that, if built as designed, the work would comply with all relevant requirements. Each designer remains responsible for their own design.

### What regulation 11M requires

| Para | In plain English | Where the app helps |
| --- | --- | --- |
| 11M(1) | Plan, manage and monitor the design work; coordinate it so the design would comply if built | Relevant Requirements Tracker; design responsibility matrix |
| 11M(2) | Take reasonable steps so designers cooperate, their work is coordinated, and they meet their own duties | Team grid, duty acknowledgements, "raise a concern" form, chasing |
| 11M(3) | Liaise with the principal contractor and share relevant information | Shared project vault; principal contractor sees tracker and concerns |
| 11M(4) | Have regard to the principal contractor's comments on compliance | Comments from the principal contractor are logged and need a recorded response |
| 11M(5)(a) | If asked, help the client give information to other designers and contractors | Client's "building information" uploads, shared in one click |
| 11M(5)(b) | Within 28 days of the appointment ending, give the client a document explaining the arrangements under (1) to (3) | Auto-drafted handover document with a 28-day countdown (see Key deadlines) |
| 11M(6) | A replacement principal designer must review the previous one's arrangements | Replacement flow: the new appointee gets the previous handover document and tracker as a review task |

Full statutory text shown on the screen (from [Part 2A, legislation.gov.uk](https://www.legislation.gov.uk/uksi/2010/2214/part/2A)):

> **11M.**—(1) The principal designer must— (a) plan, manage and monitor the design work during the design phase; and (b) coordinate matters relating to the design work comprised in the project so that all reasonable steps are taken to ensure that the design is such that if the building work to which the design relates were built in accordance with that design the building work would be in compliance with all relevant requirements.
>
> (2) The principal designer must take all reasonable steps to ensure that— (a) designers, and any other person involved in relation to design work, cooperate with the client, the principal designer, the principal contractor and each other; (b) the design work of all designers is coordinated so that the design is such that if the building work to which the design relates were built in accordance with that design the building work would be in compliance with all relevant requirements; and (c) designers, and any other person involved in relation to design work, comply with the duties under these Regulations.
>
> (3) The principal designer must liaise with the principal contractor and share with the principal contractor any information relevant to— (a) the planning, management and monitoring of the building work, and (b) the coordination of building work and design work for the purpose of ensuring compliance with all relevant requirements.
>
> (4) Where the principal contractor provides comments to the principal designer in relation to compliance with the relevant requirements, the principal designer must have regard to those comments.
>
> (5) The principal designer must— (a) if requested, assist the client in providing information to other designers and contractors; (b) when the principal designer's appointment ends, no later than 28 days after the end of the appointment, give to the client a document explaining the arrangements it put in place to fulfil the duties under paragraphs (1) to (3).
>
> (6) Where a replacement principal designer is appointed, they must review the arrangements the previous principal designer put in place for fulfilling the duties under paragraphs (1) to (3) so that all reasonable steps are taken to ensure that the design is such that if the building work to which the design relates were built in accordance with that design the building work would be in compliance with all relevant requirements.

The same pattern works for every role, with statutory text throughout: client (11A, 11D), designer (11J, 11K), contractor (11J, 11L) and principal contractor (11N). Store each briefing as a versioned `role_briefings` record (role, intro text, statutory text, source link, version), so a wording change never alters what someone has already acknowledged.

## Key deadlines

The two deadlines Ian highlighted run on different clocks. The **28-day handover** starts when the principal designer's appointment ends, which is often at the end of design, months before the building is finished. The **5-day completion statements** start when the building work is complete. The app tracks each from its own trigger event, and a principal designer who left early must still be reachable to sign at completion.

| Deadline | Clock starts | Who acts | Law | What the app does |
| --- | --- | --- | --- | --- |
| Appoint principal designer and principal contractor in writing | Must be done before the construction phase begins (before the Gateway 2 application for higher-risk work) | Client | 11D(3) | Blocks "construction started" until both appointments are signed |
| Tell building control about a principal appointment | 14 days from the appointment, when it's made after the building control application (not higher-risk work) | Client (for a domestic client, the appointee) | 11O | Pre-filled notice and 14-day countdown |
| **Handover document**: how you planned, managed and monitored | **28 days from the end of the principal designer's appointment** | Principal designer | 11M(5)(b) | Recording the appointment end date starts the countdown and drafts the document from the tracker and audit trail. Reminders on days 14, 21 and 26 |
| Same for the principal contractor | 28 days from the end of the principal contractor's appointment | Principal contractor | 11N(5)(b) | As above |
| **Completion notice** with signed statements | **Within 5 days of the building work being completed** | The person carrying out the work gives the notice; it must contain signed statements from the client and from each principal designer and principal contractor | Reg 16(4), (4A) | Statements prepared and pre-signed before completion. "Mark work complete" starts a 5-day countdown with daily chasing |
| Notice before early occupation | At least 5 days before any part is occupied ahead of completion | As above | Reg 16(5), (5A) | Triggered when an occupation date is entered |

**What the completion notice must contain** (regulation 16(4A), England):

- Names, addresses, phone numbers and emails of the client, the principal contractor (or sole contractor) and the principal designer (or sole or lead designer)
- A statement that the work is complete
- A statement signed by the client that, to the best of their knowledge, the work complies with the applicable requirements
- A statement signed by **each** principal designer and principal contractor, giving their appointment dates and confirming they fulfilled their Part 2A duties

A correction worth sharing with Ian: the BCO note does cover the 5-day deadline, in section 2.21 (quoting regulation 16) and section 7.6 (compliance declaration). It sits in **regulation 16**, which the same 2023 amendment regulations changed. Part 2A is what the principal designer is declaring they complied with; regulation 16 is what sets the 5 days.

Design consequences for the app:

- **Five days is short.** Prepare the statements in the app as the build nears completion, with appointment dates and duty status filled in from records. Signing is then one click. Treat the 5 days as calendar days, and let legal-deadline chasing run every day, ignoring the usual weekday-only rule.
- **"Each" principal designer.** The wording appears to cover everyone who held the role, including anyone replaced part-way. Former principal designers stay on the project as read-only members so they can be chased to sign. Confirm this reading with building control.
- **Evidence pack.** Add `09_Completion/`, holding the completion notice, every signed statement and both 28-day handover documents.
- **Higher-risk buildings** use a different completion route (Gateway 3 with the Building Safety Regulator). That's out of scope for v1, as before.

Two more cross-checks from the BCO note:

- Its list of relevant requirements (Table 1) includes **regulations 44E–44I** (EV charging for change of use, major renovations, non-residential and mixed-use buildings). These are on the 11Q list, but the tracker only has 44D. Add them to the requirements catalogue.
- The same table lists **regulation 38** (fire safety information). That isn't on the 11Q list as currently in force, but it is a real duty that comes due at completion or occupation. Add it to the deadlines list rather than to the tracker.

## Challenges to resolve before building

The idea is sound, but six assumptions in the brief need correcting or testing first.

1. **The principal designer doesn't appoint the team; the client does.** The client appoints the principal designer and contractor (11D). Whoever engages each designer must check their competence (11E). The principal designer's legal job is to coordinate and make sure designers comply (11M). So the tool should let your friend *run* the process, but the client must be the one who signs the appointments. Design the roles around that, or the paper trail is wrong.
2. **"I agree" is not competence.** A self-declaration alone is weak. The law asks the appointing person to take "reasonable steps to satisfy themself". The valuable thing the tool can do is record the *reviewer's decision* on evidence (qualifications, memberships, insurance, comparable projects), with who reviewed it and when.
3. **"Principal architect" is not a legal role.** Use the statutory names everywhere: client, principal designer, designer, principal contractor, contractor. Your friend's title is irrelevant; the role on this project is what counts.
4. **Contractors are part of this too.** Your brief lists designers only. Part 2A applies equally to the principal contractor and contractors. Include them from day one, even if the first project only invites them later.
5. **Higher-risk buildings change everything.** Buildings at least 18m or 7 storeys with 2+ homes (or hospitals and care homes) need extra records and a Gateway 2 application to the regulator. Ask at setup and refuse to proceed on higher-risk work in v1, rather than half-supporting it.
6. **Chasing people is a relationship risk.** Engineers will hate nagging from a robot on behalf of a peer. Make reminders polite, sent "on behalf of" your friend, capped in frequency, and let your friend preview or pause them.

**A seventh challenge, from the repositioning: "collaboration tool" invites scope creep.** Once it's a team workspace, requests will come for drawings management, RFIs, programme and cost. That is Procore and Autodesk territory, and the product would lose its edge there. Keep a simple test for every feature: *does it help a dutyholder do, or prove, a Part 2A duty or relevant requirement?* If not, it waits. The communications briefing makes the same call for marketing: lead with the principal designer's duties, and tell the wider collaboration story underneath.

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

[Diagram in the original doc: System architecture · browser, Vercel, Supabase, email and AI\]

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

Legal-deadline items get their own countdowns: the 14-day building control notification (11O), the 28-day handover documents (11M(5)(b), 11N(5)(b)) and the 5-day completion notice statements (reg 16). See Key deadlines.

Rules that keep it polite: no emails at weekends or outside 8am to 6pm UK time, except legal-deadline items, which chase daily; the owner can pause chasing for any person; every email is signed "on behalf of \[owner name\]"; one click in the email takes the person straight to their next task, after 2FA.

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

*Updated 3 Nov:* the tracker sections below refine this design. The AI now extracts facts and drafts answers, and written rules decide relevance. Where they differ, follow "Recommending applicable regs and pre-filling answers".

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

## The Relevant Requirements Tracker

The tracker should become the app's second core module, next to the dutyholder checklist. It is the principal designer's working evidence for the 11M duty to plan, manage, monitor and coordinate design. Its scope is exactly the "relevant requirements" that Part 2A defines in 11Q(1): regulations 4, 6, 7, 8, 22–28, 36, 41–44 plus Schedule 1. It also feeds the 28-day handover document in 11M(5)(b).

What the workbook holds (the `11_BRPD` file you attached):

- **26 regulation sheets, 105 provisions, 165 requirement rows.** Eight sheets cover Parts 2, 6, 7, 9, 9A and 9B of the regulations; 18 cover Schedule 1 Parts A to T. Each row carries the statutory wording.
- **The same 12 answer columns on every row:**

| Column | Type in the spreadsheet | Becomes in the app |
| --- | --- | --- |
| Strategy (responsible party) | Dropdown, 11 disciplines | Link to a project member |
| Stage 2 / 3 / 4 responsible | Dropdown per RIBA stage | One owner per stage |
| Route to compliance | Dropdown: Approved Document, ISO/EN/BS, Eurocode, Engineered solution, Performance certified solution | Fixed list |
| Design guidance followed | Free text | Pick from a versioned guidance list, plus free text |
| Design strategy / solution | Free text | Text, owned by the responsible designer |
| Notes and links to evidence | Free text | Attached files from the document vault |
| Submission status | Dropdown, 7 states (Not started → Granted approval, Not relevant) | Status that drives red/amber/green and chasing |
| Action required | Free text | Task assigned to a person, with a due date |
| Row last updated | Free text | Automatic timestamp + who changed it |

- **A cover sheet** with client, principal designer, principal contractor and 11 designer slots. The app's project team replaces it.
- **A disclaimer** (cover rows 48–51): the principal designer relies on designers' advice and does not warrant their design. Keep that wording, and keep it true in how pre-filling works (see below).

Gaps to fix in the move from spreadsheet to app:

1. **Relevance is set by hand-shading cells** green or grey. Nothing in the file records it as data, so it can't be counted, filtered or audited. In the app it becomes an explicit field with a reason and who decided it.
2. **Applicability depends on the project, and the workbook has no logic for it.** Every row starts "Not started" whatever the building is. That logic is what we add (next sections).
3. **The wording will date.** The Future Homes and Buildings Standards amend Part L and add a new L3 (on-site renewables for new dwellings) and a new regulation 40C, [taking effect on 24 March 2027](https://www.gov.uk/government/publications/the-future-homes-and-buildings-standards-building-circular-012026/the-future-homes-and-buildings-standards-building-circular-012026-letter). Transitional rules depend on when the application went in. So the requirement list must be versioned, and each project pinned to the version that applies to it.
4. **Only RIBA Stages 2–4.** Testing and commissioning (regs 41–44) and as-built evidence happen in construction. Add a Stage 5 column owned by the principal contractor.
5. **Missing roles.** No energy/SAP assessor, drainage engineer or principal contractor in the responsible-party list. In the app, any project member can own a row.
6. **Housekeeping.** The hidden data sheet links to an "Exemplar" sheet that isn't in the file, and some dropdowns use an Excel feature most tools can't read. Neither matters once the data is in the app.

**Also missing (found by checking against the BCO note):** regulations 44E–44I. They are on the 11Q relevant-requirements list, but the tracker only covers 44D. Add them to the catalogue before seeding.

Ian confirms the tracker was compiled for the RIBA. Its layout and any added wording may belong to the RIBA, so check the RIBA's terms before selling a product that copies it, especially the .xlsx export in the original layout. The statutory text itself is Crown copyright under the Open Government Licence and can be reused.

## Tracker integration: how it plugs in

The tracker uses the same recipe-and-dishes pattern as duty templates: a master **requirements catalogue** seeded once from the workbook, plus one **project requirement** row per catalogue row on each project. The parsed seed file (165 rows, JSON and CSV) is attached in the chat and goes into the repo as `/seed/tracker_requirements_seed.json`.

New tables:

| Table | Holds | Key fields |
| --- | --- | --- |
| `catalogue_versions` | Each edition of the requirement list | label (e.g. "England pre-FHBS", "England FHBS 2027"), in force from, source |
| `requirements` | One row per tracker requirement | version, sheet, ref (e.g. B4), provision, requirement text, legislation link, Approved Document, default discipline, default route |
| `applicability_rules` | Machine-readable "applies when" logic | requirement or ref, condition (JSON), result (relevant / not relevant / ask), explanation, legal basis |
| `project_facts` | The structured facts about a building | fact key (e.g. `storeys`, `work_type`), value, source (owner typed / AI extracted / document), evidence quote, confirmed by |
| `project_requirements` | The working tracker for one project | requirement, relevance, relevance reason, relevance source, owner per stage, route, guidance, strategy text, status, action, evidence files |
| `field_suggestions` | Every pre-filled value before a human accepts it | target row and field, suggested value, source (rule / AI / past project), rationale, accepted or rejected, by whom |
| requirement\_prompts | "What your response should cover" for each requirement | requirement, prompt list, version, approved by |
| stock\_texts | Each designer's own reusable standard wording | owner, discipline, ref, text, times used |

How it connects to what's already in the plan:

- **Team.** "Responsible party" points to a real project member, so a fire engineer logging in sees their B rows alongside their Part 2A duties. One task list per person.
- **Chasing.** Rows that aren't at the target status for the current RIBA stage join that person's daily digest. Example: "3 requirements need a design strategy before the Stage 3 gate on 12 Jan".
- **Dashboard.** A second grid: Schedule 1 parts × status, matching the spreadsheet's own summary charts.
- **Evidence pack.** Add `08_Relevant_Requirements/`, holding the tracker as **.xlsx in the original layout**, so building control officers and clients see the format they know, plus a PDF. Generate it on the server (the `exceljs` library can write into a copy of the template).
- **Import.** A one-off importer that reads a filled-in tracker, so projects already under way can move in without retyping.
- **Handover.** The 11M(5)(b) handover document is generated mostly from this tracker: who owned what, what route was taken, what's still open.

**Who fills in the tracker** (confirmed by Ian):

- The **principal designer** has overall responsibility for making sure every relevant row is completed by the right designer. They coordinate; they don't write other designers' answers.
- **Each designer** completes only the rows in their own area of expertise. Mechanical and electrical engineers carry a large share.
- **A note on "lead designer".** In Part 2A it has a narrow meaning. Where there's only one contractor, the designers agree in writing which of them takes on the principal designer duties (11D(7)). The app uses "principal designer" for whoever runs the tracker, and "lead designer" only in that single-contractor case.
- The principal designer's view shows everyone's rows and the gaps. Each designer sees "My requirements".

**Links for each requirement.** Ian asked for links to the source text. Every row now links to its regulation on legislation.gov.uk and names the matching Approved Document, which links to gov.uk. The updated seed file adds `legislation_url` and `approved_document` fields. Schedule 1 rows currently link to the whole schedule; ask Claude Code to test whether deeper links to each Part resolve.

The status mapping for red/amber/green: Not started = red; Design in progress, Ready for submission, Submitted for approval, Granted conditional approval = amber; Granted approval = green; Not relevant = grey, which counts as done only once someone has confirmed it.

## Recommending applicable regs and pre-filling answers

Don't ask the AI "which regulations apply?". Ask it to **pull out the facts** about the building, let **written rules decide** relevance from those facts, **help designers write their own project-specific answers faster**, and have **people confirm**. The legal triggers are mostly clear-cut facts (type of work, use, height, number of dwellings). Rules give the same answer every time, can explain themselves, and can be checked by your friend. An AI's direct judgement can do none of those things reliably.

[Diagram in the original doc: Applicability and pre-fill pipeline · 5 steps, 1 loop back\]

The AI only touches steps 1 and 4. Relevance comes from rules your friend can read, and nothing counts as done until a person accepts it.

### Step 1: the facts that decide relevance

About 15 facts settle most rows. The setup screen asks for these, and the AI pre-fills them from the description and documents.

| Fact | Example values | Mainly drives |
| --- | --- | --- |
| Type of work | New build, extension, material alteration, material change of use (which class in reg 5), controlled service or fitting only | Reg 4, reg 6 and the whole of Schedule 1 |
| Building use | House, flats, HMO, hotel, school, other non-domestic, mixed | E, M1 vs M4, O, Q, R, S, T |
| Storeys and height | Number of storeys, height of top storey, over 11 m, 18 m+ | B4(1), higher-risk check |
| New dwellings | Count | Reg 36 / G2, O, Q, R, S |
| Parking | Spaces created or affected | S, reg 44D |
| Drainage | New connections, septic tank, building over a sewer | H1–H6 |
| Heat and fuel | Combustion appliances, oil or LPG storage | J1–J7 |
| Electrics and generation | Electrical work in dwellings, PV or batteries | P, L2 (and L3 from 2027) |
| Cavity insulation | Yes / no | D1 |
| Planning conditions | Any condition invoking an optional requirement (M4(2), M4(3), the tighter water limit) | Reg 4(1B), M4, G2 |
| Major renovation | More than 25% of the surface | R, S |
| Application date | Date of building control application, expected start | Which catalogue version applies (FHBS transition) |

The planning decision notice is worth asking for at upload: optional requirements only apply when a planning condition says so, and descriptions rarely mention it.

**Is there a standard description document?** No single one, but three documents most projects already have cover most of these facts: the building control application (which describes the proposed work and the building's use), the planning application and decision notice (with its conditions), and the RIBA Stage 1 brief or Design and Access Statement. *Question for Ian: which of these does he usually have when he's appointed?*

### Step 2: rules decide relevance

Each rule is a small piece of data, not code, so your friend can read and change it:

```json
{
  "ref": "E4",
  "when": { "fact": "building_use", "includes": "school" },
  "then": "relevant",
  "otherwise": "not_relevant",
  "reason": "E4 covers acoustic conditions in schools",
  "basis": "Schedule 1 E4; reg 6(1)(g)"
}
```

Three safety rules for the engine:

- **A missing fact means "ask", never a guess.** The row shows "Needs: height of top storey" until someone answers.
- **No matching rule means "relevant".** Wrongly including a row costs a click to dismiss. Wrongly excluding one can mean a missed requirement.
- **"Not relevant" always carries a reason** and the name of whoever confirmed it.

Regulation 6 gives you a head start. Its text in the tracker already lists which Schedule 1 requirements apply to each class of material change of use, so those rules can be written straight from the statute. Start with about 20 rules covering the big triggers above. Everything else defaults to relevant until your friend adds a rule.

### Step 3: what gets pre-filled, and what designers must write

**The AI never writes design responses.** This is Ian's position, and the plan now follows it. Each designer writes text specific to the project. A generic answer attached to a specific design can describe something that isn't suitable for that building. After a serious incident, that text would be examined as the record of what was designed and why. So the app pre-fills only the fields where a wrong suggestion is easy to spot and costs nothing.

| Field | Filled by | How |
| --- | --- | --- |
| Relevance | Rules, confirmed by the principal designer | Step 2 |
| Reason a row is "not relevant" | AI draft from the confirmed facts, principal designer confirms | E.g. "E4 not relevant: the building is offices, not a school." Ian already writes these, and each draft names the fact it relies on |
| Responsible party, per stage | Default table + the actual team | E.g. A → structural, B → fire, E → acoustic, F/G/J/L/P → MEP, H → civils, K/M/Q/T → architect. If that discipline isn't appointed, flag it to the principal designer |
| Route to compliance | Designer picks; a default is suggested | The dropdown to the right of the stage columns: Approved Document guidance, ISO/EN/BS guidance, Eurocode guidance, Engineered solution, Performance certified solution |
| Design guidance followed | Designer picks from a versioned list | E.g. the current Approved Document edition, a named BS or Eurocode |
| Design strategy / solution | **Designer only** | Helped by prompts and the designer's own stock text (below) |
| Action required | Principal designer or designer; rules can propose standard tasks | E.g. "Provide SAP calculations at Stage 4" |
| Evidence, notes | Never | Real files only |
| Submission status | Never | Starts at Not started; Not relevant only from step 2 + confirmation |

**Helping designers write faster without generic answers.** Ian notes that each response mixes project-specific text with wording common to most projects. The app supports both, kept apart:

1. **Two text boxes per row.** "Standard basis" holds the generic part. "How this applies to this project" is required before a row can be submitted.
2. **Each designer's own stock text.** Designers save their own standard wording, e.g. an MEP engineer's usual statement on commissioning. It can only go into "Standard basis", and every use is logged, so the principal designer can see which rows lean on standard wording.
3. **Prompts, not answers.** Under each requirement, a short "what your response should cover" list. For B1, for example: evacuation strategy, alarm category, escape routes and travel distances, reference to the fire strategy report. Ian writes or approves these once, and they're versioned. The AI can help draft prompts because they're questions, not design.
4. **A "My requirements" view.** Ian points out that mechanical and electrical engineers own a large share of the rows (F, G, J, L, P, much of H, R and S, and regs 22–28 and 41–44). Each designer gets one list of all their rows, grouped by stage gate, to work through in one sitting.
5. **Copy from a past project**, from the designer's own projects only. The text arrives as a draft, with the project-specific box empty.

An optional later feature, only if Ian wants it: an **AI checker, not a writer**. After a designer submits, it compares the text with the confirmed project facts and flags contradictions. For example: "mentions sprinklers, but the facts say none"; "refers to 3 storeys, but the project has 5"; "identical to the text on another project". It never rewrites. Flags go to the designer and the principal designer.

What the system learns over time: relevance decisions and not-relevant reasons (which become new rules), better prompts, and each designer's stock text. It does not learn or reuse design answers across designers.

### Step 4: people confirm

- **Suggested values look different** (grey, with a "Suggested" label) until the responsible person accepts or edits them.
- **Only accepted values count toward green.** That keeps the tracker's disclaimer true: the principal designer is coordinating designers' answers, not writing them.
- **The owner confirms relevance a Part at a time** ("Accept 9 rule-based decisions for Part B"), with each reason visible. One "accept all" button for 165 rows would invite rubber-stamping.
- Every suggestion, acceptance and edit goes in `field_suggestions` and the audit log.

### How to know it works

Ask your friend for 5–10 finished trackers from past projects, with the project descriptions. Run the pipeline on each description and compare with what your friend actually decided. Track two numbers: **missed relevant rows** (target zero) and **how often the principal designer changes the suggested not-relevant reasons**. Re-run the comparison after every change to rules or prompts.

### Claude Code prompts

Build this as two phases after Phase 7 (evidence pack). It replaces the simpler Phase 8.

- *"Read PLAN.md, section 'Tracker integration'. Create migrations for catalogue\_versions, requirements, project\_requirements and field\_suggestions with RLS. Seed requirements from /seed/tracker\_requirements\_seed.json as version 'England pre-FHBS'. Build a tracker page grouped by regulation sheet showing the 12 tracker columns, editable by the row's responsible member, with status colours. Add an export that writes the tracker into /templates/tracker\_template.xlsx using exceljs."*
- *"Read PLAN.md, section 'Recommending applicable regs'. Add project\_facts and a setup screen for the facts table. Write a rules engine that evaluates applicability\_rules JSON (missing fact = ask, no rule = relevant), with tests. Add a server action that sends the description and uploaded documents to the Claude API and returns facts validated by a zod schema, each with an evidence quote or null. Then generate suggestions for owners, route, guidance and not-relevant reasons into field\_suggestions, shown as 'Suggested' until accepted. Never generate design strategy text. Instead add a requirement\_prompts table, a stock\_texts library owned by each designer, and two text fields per row (standard basis, project-specific application), with the project-specific one required before submission."*

## Build phases

Thirteen phases, each ending in something you can click. Do them in order: security first, then the dutyholder experience, then chasing, deadlines and the tracker. Paste each prompt into Claude Code once the previous phase's "done when" is true.

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
   - *Built, then switched off on 6 Nov 2026 (`DEMO_ENABLED = false`). Not part of the remaining prototype work.*
8. **Phase 7 — Evidence pack.**
   - Prompt: *"Generate PDFs for competence statements and acknowledgements, and build the export: the folder structure in PLAN.md zipped with 00\_Index.pdf and 99\_Audit\_Trail.csv, delivered by an expiring download link."*
9. **Phase 8 — Statutory deadlines.** Follow "Key deadlines".
   - Build: trigger dates on the project and on each appointment (building control application date, appointment end date, construction started, work complete, early occupation). Each starts its own clock: 14 days for the 11O notification, 28 days for each 11M(5)(b) / 11N(5)(b) handover, 5 calendar days for the reg 16 completion statements. Add the principal contractor's handover duty and the completion statements (client, each principal designer, each principal contractor) as checklist items. "Construction started" is blocked until both principal appointments are signed. Legal-deadline items chase every day, ignoring quiet hours and weekends. People who held a principal role and left stay on the project read-only, so they can still sign at completion. The evidence pack gains `09_Completion/`.
   - Done when: on a test project, recording a principal designer's appointment end date gives that person a handover task due 28 days later; marking the work complete gives the client and every principal (current and former) a completion statement due 5 days later; and the chasing job sends those reminders on a Saturday.
10. **Phase 9 — Role briefings and concerns.** Follow "The principal designer role: briefing screen" and rows 11I/11K/11L/11M(4).
    - Build: versioned `role_briefings` shown before each role's checklist, using statutory text only; a "raise a concern" form for designers and contractors, sent to the principal designer or principal contractor; principal contractor comments that need a recorded response; `06_Concerns/` filled in the evidence pack; the replacement principal designer review task (11M(6)).
    - Done when: a designer raises a concern, the principal designer records a response, and both appear in the evidence pack.
11. **Phase 10 — Relevant Requirements Tracker (no AI).** Use the first prompt under "Claude Code prompts" in "Recommending applicable regs". Seed from `/seed/tracker_requirements_seed.json` (165 rows) and add regulations 44E–44I. Relevance is set by the principal designer by hand, with a reason; no rules engine or AI yet.
    - Done when: a fire engineer sees only their Part B rows under "My requirements", the principal designer sees every row and the gaps, the Schedule 1 grid shows status by Part, and the evidence pack has `08_Relevant_Requirements/`.
12. **Phase 11 — Demo videos and landing page.** Rewrite the landing page to the communications briefing, keeping "Sign in" as the call to action (no pilot form), only describing what is built, with the disclaimer footer. Re-record the project set-up video and add a tracker video from real app screens with fictional data (demo mode stays off).
13. **Phase 12 — Go live with the real project.** Run the security checklist (below), turn on backups, publish the privacy notice, walk your friend through it, invite one friendly engineer first, then everyone.

**Pilot phase (not started, by decision on 6 Nov 2026):** AI fact extraction, the rules engine and suggestions (the second prompt under "Claude Code prompts"), requirement prompts and stock text, importing existing trackers, demo mode, and the pilot sign-up.

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

The competitive picture has moved since the first draft. [BR Principal Designer (ArcTechPro)](https://uk.arctechpro.com/brpd) already offers competence and compliance statement builders, a dutyholder portal and dashboards. The RIBA's free [Principal Designer Guide templates](https://www.riba.org/work/insights-and-resources/riba-principal-designer-guide-downloadable-templates/) include the tracker, a lead designer agreement, a completion statement and competence statements. Our differences are the deadline engine and chasing, designer-owned answers with stock text, and AI that suggests relevance. Before the pilot, have a principal designer try BR Principal Designer and tell us honestly where it's better.

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
- [The Building Regulations 2010, regulation 16 (legislation.gov.uk)](https://www.legislation.gov.uk/uksi/2010/2214/regulation/16/data.pdf)
- [BSR becomes standalone body (gov.uk, 27 January 2026)](https://www.gov.uk/government/news/bsr-becomes-standalone-body-in-landmark-step-towards-single-construction-regulator)
- [Changes to the building safety regime in Wales (Local Government Lawyer)](https://localgovernmentlawyer.co.uk/projects-and-regeneration/317-projects-features/99392-changes-to-the-building-safety-regime-in-wales)
- [Future Homes and Buildings Standards circular 01/2026 (gov.uk)](https://www.gov.uk/government/publications/the-future-homes-and-buildings-standards-building-circular-012026/the-future-homes-and-buildings-standards-building-circular-012026-letter)
- BCO Technical Note: Building Safety Act, BCO Technical Affairs Committee, September 2026 (supplied by Ian; [bco.org.uk](https://www.bco.org.uk))
