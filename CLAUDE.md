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