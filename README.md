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
