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

<!-- videowright:start -->
*Auto-managed by Videowright installer. Edits inside this block will be overwritten on re-install. Add your own context outside the markers.*

The folder `videos/` in this project is a [Videowright](https://github.com/scosman/videowright) project -- a library for composing animated explainer videos in HTML/CSS/JS.

For any video-related work, use the `videowright` skill (loaded automatically from `.claude/skills/videowright` or `.agents/skills/videowright`). It has full guidance on segments, voiceovers, styles, and the dev server.

Key paths:
- `videos/videowright.config.ts` -- project config and default style.
- `videos/videos/` -- one folder per video.
- `videos/styles/` -- design tokens and shared styling.
- `videos/segments/`, `videos/components/`, `videos/transitions/` -- shared building blocks.
<!-- videowright:end -->
