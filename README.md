# Dutyholder

Secure web app for Building Regulations Part 2A dutyholder appointments,
duty acknowledgements and competence evidence (England). See `PLAN.md` for
the full plan and `CLAUDE.md` for the working rules.

## Phase 1: what's built

- Invite-only sign-up (single-use links that expire after 7 days)
- Email + password login
- Mandatory two-factor (authenticator app) with 10 one-time recovery codes
- A gatekeeper (`src/proxy.ts`) that blocks every page until 2FA is done,
  and signs people out after 12 hours of inactivity
- `profiles` table with RLS: you can only see your own row, only after 2FA
- Append-only `audit_log` recording sign-ups and 2FA events

## Phase 2: what's built

- Projects with set-up questions (domestic client, number of contractors,
  CDM certification; higher-risk work refused in v1)
- Team members added by email with their statutory role
- `duty_templates`: the Part 2A duties from `PLAN.md`, versioned, never edited
- `generate_checklist()`: re-runs automatically when a member or set-up
  answer changes; withdraws (never deletes) items that stop applying
- RLS: members see the project and team; you see your own items, the owner
  sees everyone's; owners can read their project's audit trail

## Phase 3: what's built

- **Invite** button on the team list: emails a single-use link via Resend,
  or shows it to copy if email isn't set up yet
- Invited people land on **Your tasks** after sign-up and 2FA, with progress
- Acknowledgements signed with a typed name; the exact wording is fingerprinted
- Four-part competence statement (reg 11F/11Q(4)) that autosaves, belongs
  to the person, is versioned and frozen once submitted, and can be reused
- Evidence uploads to a private bucket; the server fingerprints each file
  (SHA-256); files are withdrawn with a reason, never deleted
- Simple form and upload tasks; appointments and reviews wait for phase 4

## Phase 4: what's built

- Competence reviews by the owner or whoever holds the client's "check
  competence" duty: Satisfied / Needs more info with a note, recording the
  fingerprint of the exact version reviewed; the client's review duties tick
  themselves off; "needs more info" requires a new version
- Appointment letters (PD and PC appointments, lead designer agreement, CDM
  certification) from draft templates in `src/lib/letters.ts`: frozen and
  fingerprinted when issued, signed by every party with a typed name, void
  with a reason, downloadable as PDF with a signature block
- "Report a change" (reg 11I): records the report, sends competence back for
  review and notifies the owner
- Notification emails (when Resend is set up), each logged in the audit trail

## Phase 5: what's built

- Chasing engine (`src/lib/chase`): day 3 nudge, day 7 reminder (naming the
  start date), day 14 firm reminder copying the owner, then weekly; owner's
  weekly "behind" digest from day 10. Weekdays 8am–6pm UK only, one email per
  person per day, never to paused people, signed on the owner's behalf
- Every reminder is recorded before sending; a step can never repeat
- All chasing time goes through `projectNow(project)` (`src/lib/clock.ts`)
- `/api/cron/chase`, called by Vercel Cron at 09:00 UTC on weekdays
  (`vercel.json`), protected by `CRON_SECRET`; the only user of the secret key
- Owner dashboard: people × duties grid, last chased, next reminder, Pause
  and Chase now

## Phase 6: what's built

- **Try a demo** on the home page: a demo project with six fictional people
  (client, principal designer, structural, fire and MEP engineers, principal
  contractor), each with a scripted personality (`src/lib/demo/simulate.ts`)
- Demo projects run on an anchored clock (`projectNow`): each simulated day is
  10am on the next calendar day, so the real chasing rules apply unchanged
- Controls: Advance 1 day, Advance to next event, Play (one day per second)
- Outbox: every email the engine would have sent, word for word; demo projects
  are invisible to the real cron job, so nobody fictional is ever emailed
- Line chart of items complete by simulated day, with a table view

## Phase 7: what's built

- **Evidence pack** (owner only, from the dashboard or project page): built in
  the background, zipped in the PLAN.md folder structure with
  `00_Index.pdf` (status, warnings, and every file's SHA-256) and
  `99_Audit_Trail.csv` (formula-safe)
- PDFs for the project summary, appointment letters, each competence
  statement version (with review decisions), signed acknowledgements,
  notifications and handover; original evidence files included byte for byte
  and re-fingerprinted against what was recorded at upload
- Stored in a private `exports` bucket; downloadable by the owner after 2FA
  for 24 hours via a 60-second link; every download logged
- The export job (`src/lib/evidence/job.ts`) is the only other user of the
  secret key, as PLAN.md allows

## First-time setup (dev project)

1. **Supabase dashboard → your `dutyholder-dev` project:**
   - *Authentication → Sign In / Providers → Email*: turn **Confirm email** off
     (the invite link already proves the address) and set minimum password
     length to **12**.
   - *Authentication → Multi-Factor*: check **TOTP (App Authenticator)** is enabled.
2. Copy `.env.example` to `.env.local` and fill in the values it describes.
3. Apply the database migrations:
   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_DEV_PROJECT_REF
   npx supabase db push
   ```
4. Run the tests (unit tests + database access-rule tests):
   ```bash
   npm test
   ```
5. Start the app:
   ```bash
   npm run dev
   ```

## Creating an invite (phase 1)

Until the team screen arrives in phase 3, create invites in the Supabase
dashboard's **SQL Editor**:

```sql
select 'http://localhost:3000/signup?token=' || public.create_invite('you@example.com');
```

Copy the link it returns and open it. Each link works once, for that email only.

## Useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Run the site locally at http://localhost:3000 |
| `npm test` | Run all tests (database tests need `DEV_DATABASE_URL`) |
| `npm run test:unit` | Run only the tests that don't need a database |
| `npm run typecheck` | Check the TypeScript for mistakes |
| `npm run lint` | Check code style |
| `npx supabase db push` | Apply new migration files to the linked database |
| `npm run db:types` | Regenerate TypeScript types after a database change |
