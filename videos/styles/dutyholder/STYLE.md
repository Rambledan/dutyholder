---
title: Dutyholder
slug: dutyholder
picker_description: Matches the Dutyholder design system. Geist, cool grey canvas, ink, indigo accent, red/amber/green status, real product screens in a browser frame.
font_sources:
  - https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap
---

# Style: Dutyholder

## When to use
Product walkthroughs and explainers for the Dutyholder app, where real screenshots of the app are the star and the
frame around them should feel like the product itself: calm, precise, trustworthy.

## Aesthetic rules
- Cool grey canvas (`--color-bg`), ink (`--color-fg`), muted secondary text (`--color-muted`), matching the app's
  design system tokens in src/app/globals.css.
- One highlight colour: indigo (`--color-accent`), the app's accent. Use it for the key phrase on a
  title, a progress fill, or a highlight ring on a screenshot. Never more than one accent element per beat.
- Status colours (`--color-red`, `--color-amber`, `--color-green`) only ever mean red/amber/green task status,
  exactly as in the app. Always paired with a label, never colour alone.
- Geist for everything (display and body); Geist Mono for small labels such as regulation numbers ("REG 11F") and step
  counters ("STEP 2 / 6").
- Real app screens sit in a light browser frame (`--radius-lg` corners, hairline border, soft shadow). Screens are
  large: the frame spans 70-85% of the width. Zoom and pan into the part that matters rather than shrinking text.
- Headings 72px+, body 36px+, micro-labels 20px+ mono uppercase with letter-spacing. Left-aligned text on a
  `--safe-x` margin; generous but not wasteful whitespace.
- Rounded corners (`--radius-md` on cards and buttons) like the app's shadcn components. No gradients, no textures.

## Motion vocabulary
- Calm and deliberate: fades with a short rise (16-24px), 400-700ms, `--ease-out`.
- Screens enter by scaling from 0.96 to 1 with a fade; focus moves by smoothly zooming (scale 1 → 1.4-1.8) and
  panning to the area being discussed, then back out.
- Highlights: an indigo ring (`--color-accent`, 4px) draws around a UI element, or a soft dark scrim dims everything
  else. A small black cursor dot can glide to a button and "press" it (scale 0.9 → 1).
- Captions slide up from the bottom of the frame in an ink pill with white text.
- Transitions between scenes: quick fades (300-400ms). No spins, bounces or flashy wipes.

## Don'ts
- Don't invent UI: only show real screenshots of the app.
- Don't use red, amber or green for anything except task status.
- Don't show secrets: blur QR codes, recovery codes, tokens and invite links.
- Don't crowd the frame with more than one idea per beat.
