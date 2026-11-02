# Plan: Your Part 2A duties in Dutyholder (dutyholder's view)

## Purpose
- Audience: dutyholders invited to a project (designers, contractors, clients). Shown through Tom Ellis, a
  fictional structural designer invited to "The Old Mill" by the principal designer, Alex Morgan.
- Takeaway: the invite is legitimate and quick. You sign up securely, acknowledge your duties, submit a competence
  statement once, and reuse it on future projects.
- Constraints / hard guidelines:
  - Only real app screens, captured with scripts/capture-dutyholder.mjs. The email is the app's real invite
    template (src/lib/invite-email.ts), shown in a plain mail window.
  - Never show secrets: the QR code stays blurred, and the invite link isn't visible.
  - Use the statutory role names.
  - Target length: about 90 seconds.

## Style
- Active style: dutyholder (same as project_setup). Reuses components/app-screen.

## Audio intent
- Voiceover: yes (AI voice, Gemini via OpenRouter, Charon). Postponed for now, so the draft is silent.
- Sound effects: no
- Background music: no

## Segment outline
1. dh-intro: title card.
2. dh-email: the invite email: why it matters, then Accept invite (01).
3. dh-signup: create an account, with the email already filled in (02).
4. dh-two-factor: two-factor login (03).
5. dh-tasks: your task list and progress, then Start (04).
6. dh-acknowledge: read the duty, tick, type your name to sign (05).
7. dh-competence: competence statement: questions, behaviours, evidence, submit (07, scrolling).
8. dh-report-change: agree to report a change in competence (08).
9. dh-done: all done; the statement waits for review (09).
10. dh-passport: details and competence passport saved for next time (10).
11. dh-outro: closing card.

## Script
See voiceover_script/script.md (assembled from each segment's `voiceover` field).

---

## Log

### 2026-11-02: Initial plan and scaffold
- Captured 10 screens as Tom Ellis. Declined a stray invitation (a leftover project from an earlier failed capture
  run) and retook 10-account.
- Built segments dh-* on the shared app-screen component. Silent draft rendered; voiceover postponed.

### 2026-11-02: Re-recorded with the new design system
- The app now uses the Dutyholder design system (indigo accent, cool grey canvas, sidebar). Re-recorded every
  screen with new fictional .test accounts; the old ones in the dev database can't be reused.
- Style tokens updated to match src/app/globals.css (accent #4f46e5, canvas #eef0f4).
- Segments now read zoom and highlight areas from the boxes in manifest.json, so a re-recording no longer needs
  hand-edited coordinates.
