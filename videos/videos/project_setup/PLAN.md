# Plan: Setting up a project in Dutyholder

## Purpose
- Audience: principal designers (architects and lead consultants who take the Building Regulations PD role).
- Takeaway: setting up a Part 2A project takes minutes. You answer a few scoping questions, add the team under
  their statutory roles, and Dutyholder builds every checklist and chases people for you.
- Constraints / hard guidelines:
  - Only real app screens (captured from the dev app as the fictional "Alex Morgan, Morgan Architects").
  - Never show secrets: the QR code, recovery codes and invite links stay blurred.
  - Use the statutory role names: client, principal designer, designer, principal contractor, contractor.
  - Hide the developer note "Phase 8 will use this…" under the description field (cover or crop it).
  - Crop or zoom so the focused date field ("01" selected) isn't a distraction.
  - Target length: about 90 seconds.

## Style
- Active style: dutyholder
- Notes: screens sit in a browser frame. Each beat zooms or pans to the relevant area, with a green ring and a
  caption pill.

## Audio intent
- Voiceover: yes (AI voice). Calm, confident, British English, about 150 words a minute.
- Sound effects: no
- Background music: no
- Notes: pacing follows the narration. Each `waitForNext` matches a sentence.

## Segment outline
1. ps-intro: title card, "Set up a Part 2A project in minutes".
2. ps-signup: invite email leads to Create account (01-signup).
3. ps-two-factor: two-factor login and recovery codes (02, 03), with secrets blurred.
4. ps-new-project: home, then New project, name and site (04, 05).
5. ps-help-marks: question marks explain terms like "domestic client" (06).
6. ps-scoping: scoping questions decide who gets which duties (07).
7. ps-project-created: set-up summary (08).
8. ps-add-team: add people under statutory roles, with firms allowed (09).
9. ps-invite: one click to invite; status shows on the team list (10).
10. ps-checklists: everyone's duty checklist is built automatically (11, scroll).
11. ps-dashboard: red/amber/green dashboard and automatic reminders (12).
12. ps-outro: closing card.

## Script
1. Dutyholder helps you manage Part 2A dutyholder duties. Here's how a principal designer sets up a new project.
2. You start from an invite. Create your account with your name and a strong password.
3. Then turn on two-factor login with an authenticator app, and save your recovery codes somewhere safe.
4. From your projects page, click New project. Give it a name, a site address and a short description.
5. Not sure what a term means? Hover over any question mark for a plain-English explanation.
6. A few scoping questions follow: is it higher-risk, is the client domestic, and how many contractors will there be? Your answers decide which duties apply to whom.
7. Create the project, and the set-up is summarised at the top.
8. Next, add your team under their statutory roles: the client, designers and their disciplines, and the principal contractor. A firm can hold an appointment too.
9. Click Invite, and each person gets an email with a secure link. You can see who has joined and who hasn't.
10. Dutyholder builds everyone's checklist for you: acknowledgements, competence statements and evidence, all tied to the regulations.
11. The dashboard shows each person's progress in red, amber and green. Reminders go out automatically, so you don't have to chase.
12. That's your project set up, in a few minutes. Dutyholder.

---

## Log

### 2026-11-02: Initial plan
- Captured 12 real screens with scripts/capture-app.mjs. Retook 10-team-invite without the Resend error line.
- Style "dutyholder" created, with sample segments title and ui-showcase.

### 2026-11-02: Initial scaffold
- Created segments: ps-intro, ps-signup, ps-two-factor, ps-new-project, ps-help-marks, ps-scoping,
  ps-project-created, ps-add-team, ps-invite, ps-checklists, ps-dashboard, ps-outro.
- Shared component components/app-screen: a browser frame with camera zoom/pan, green rings, masks and caption pill.
  The frame is drawn at 0.86 scale so captions get their own band and don't cover the screen.
- Timeline: 12 segments with fade transitions, style dutyholder, about 81s at the placeholder timings.
- Voiceover: drafted from the plan script and written to voiceover_script/script.md. Provider: Gemini via
  OpenRouter, voice Charon.
