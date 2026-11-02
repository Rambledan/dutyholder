// Walks through "setting up a project" in the REAL Dutyholder app (local dev
// server + dev database) as a fictional principal designer, taking sharp
// screenshots for the video. Secrets (QR code, recovery codes, invite link)
// are blurred before each screenshot.
//
// Usage (dev server running on :3000):
//   node scripts/capture-app.mjs
// Output: videos/project_setup/assets/screens/*.png + manifest.json

import { createHmac, randomBytes } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const rootRequire = createRequire(path.join(appRoot, "package.json"));
const { Client } = rootRequire("pg");
const dotenv = rootRequire("dotenv");
dotenv.config({ path: path.join(appRoot, ".env.local"), quiet: true });

const BASE = "http://localhost:3000";
const OUT = path.resolve(here, "../videos/project_setup/assets/screens");
mkdirSync(OUT, { recursive: true });

// The fictional people in the demo. Domains are reserved example domains.
const ALEX = { name: "Alex Morgan", email: "alex@morgan-architects.example", company: "Morgan Architects", title: "Principal Designer" };
const TEAM = [
  { email: "priya.shah@wharfside.example", name: "Priya Shah", role: "client", discipline: "" },
  { email: "tom.ellis@ellis-structures.example", name: "Tom Ellis", role: "designer", discipline: "structural" },
  { email: "grace.okafor@okafor-fire.example", name: "Grace Okafor", role: "designer", discipline: "fire" },
  { email: "ben.carter@carter-mep.example", name: "Ben Carter", role: "designer", discipline: "mep" },
  { email: "site@northbank.example", name: "Northbank Construction Ltd", role: "principal_contractor", discipline: "", firm: true },
];

// RFC 6238 code from a base32 secret, as an authenticator app computes it.
function totp(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.replace(/=+$/, "")].map((c) => alphabet.indexOf(c).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1] & 15;
  return ((h.readUInt32BE(o) & 0x7fffffff) % 1e6).toString().padStart(6, "0");
}
async function freshCode(secret) {
  const left = 30 - (Math.floor(Date.now() / 1000) % 30);
  if (left < 6) await new Promise((r) => setTimeout(r, (left + 1) * 1000));
  return totp(secret);
}

const manifest = { viewport: { width: 1440, height: 900 }, screens: {} };

async function box(page, locator) {
  const b = await locator.boundingBox();
  if (!b) return null;
  const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  return { x: Math.round(b.x + scroll.x), y: Math.round(b.y + scroll.y), w: Math.round(b.width), h: Math.round(b.height) };
}

// Viewport or full-page screenshot plus named element boxes (page coords).
async function shot(page, name, { fullPage = false, highlights = {} } = {}) {
  await page.waitForTimeout(400);
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(OUT, file), fullPage });
  const size = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
  const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  const boxes = {};
  for (const [key, loc] of Object.entries(highlights)) boxes[key] = await box(page, loc);
  manifest.screens[name] = {
    file,
    fullPage,
    // Size of the captured image in CSS pixels (the PNG is 2x).
    width: fullPage ? size.w : 1440,
    height: fullPage ? size.h : 900,
    // Viewport shots: boxes are relative to the viewport, so subtract scroll.
    highlights: Object.fromEntries(Object.entries(boxes).map(([k, b]) => [k, b && (fullPage ? b : { ...b, x: b.x - scroll.x, y: b.y - scroll.y })])),
  };
  console.log("captured", file);
}

const blur = (page, selector) =>
  page.evaluate((sel) => document.querySelectorAll(sel).forEach((el) => { el.style.filter = "blur(10px)"; }), selector);

async function main() {
  const db = new Client({ connectionString: process.env.DEV_DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  const { rows: existing } = await db.query("select id from auth.users where lower(email) = $1", [ALEX.email]);
  if (existing.length) throw new Error(`${ALEX.email} already exists in the dev database; change ALEX.email to record again.`);
  const { rows: [{ token }] } = await db.query("select public.create_invite($1) as token", [ALEX.email]);
  await db.end();

  const password = `Demo-${randomBytes(12).toString("base64url")}`;
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: "en-GB", timezoneId: "Europe/London" });
  // Hide the Next.js dev-mode badge from every screen.
  await context.addInitScript(() => {
    const css = "nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }";
    document.addEventListener("DOMContentLoaded", () => {
      const s = document.createElement("style");
      s.textContent = css;
      document.head.appendChild(s);
    });
  });
  const page = await context.newPage();

  // 1. Accept the invite and create an account.
  await page.goto(`${BASE}/signup?token=${token}`);
  await page.getByLabel("Full name").fill(ALEX.name);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("checkbox").check();
  await shot(page, "01-signup", { highlights: { createButton: page.getByRole("button", { name: "Create account" }), form: page.locator("form") } });
  await page.getByRole("button", { name: "Create account" }).click();

  // 2. Two-factor set-up.
  await page.waitForURL(/\/mfa\/enrol/);
  await page.locator('img[alt^="QR code"]').waitFor();
  const secret = (await page.locator("details code").textContent())?.trim();
  // Keep the login safe immediately (outside the project, so the dev server
  // doesn't reload), in case a later step fails.
  writeFileSync(path.join(tmpdir(), "dutyholder-demo-account.json"), JSON.stringify({ email: ALEX.email, password, secret }));
  await blur(page, 'img[alt^="QR code"], details code');
  await page.getByLabel(/6-digit code/).fill(await freshCode(secret));
  await shot(page, "02-two-factor", { highlights: { qr: page.locator('img[alt^="QR code"]'), code: page.getByLabel(/6-digit code/) } });
  await page.getByRole("button", { name: "Turn on two-factor" }).click();

  await page.getByText("Save your recovery codes").waitFor();
  await blur(page, "ul.font-mono li");
  await page.getByRole("checkbox").check();
  await shot(page, "03-recovery-codes", { highlights: { codes: page.locator("ul.font-mono") } });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(`${BASE}/`);

  // 3. Save company details once (used on every project), then home.
  await page.goto(`${BASE}/account`);
  await page.getByLabel("Company").fill(ALEX.company);
  await page.getByLabel("Job title").fill(ALEX.title);
  await page.getByRole("button", { name: "Save details" }).click();
  await page.getByText("Saved.").waitFor();
  await page.goto(`${BASE}/`);
  await page.getByText("No projects yet").waitFor();
  await shot(page, "04-home", { highlights: { newProject: page.getByRole("link", { name: "New project" }) } });

  // 4. New project: set-up questions, with an info mark open.
  await page.getByRole("link", { name: "New project" }).click();
  await page.waitForURL(/\/projects\/new/);
  await page.getByLabel("Project name").fill("The Old Mill");
  await page.getByLabel("Site address").fill("Canal Wharf, Leeds");
  await page.locator("#description").fill("Conversion of a three-storey Victorian mill into offices, with a new stair core and rooftop plant.");
  await page.locator("#construction_start_date").fill("2027-03-01");
  await shot(page, "05-new-project", { highlights: { name: page.getByLabel("Project name"), description: page.locator("#description") } });

  const domesticInfo = page.getByRole("button", { name: 'What does "Domestic client" mean?' });
  await domesticInfo.scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, -120);
  await domesticInfo.hover();
  await page.getByText("Read more in Help").waitFor();
  await shot(page, "06-help-mark", { highlights: { popover: page.locator('[data-slot="popover-content"]'), question: page.getByText("Is the client a domestic client?") } });
  await page.mouse.move(5, 5);

  const create = page.getByRole("button", { name: "Create project" });
  await create.scrollIntoViewIfNeeded();
  await shot(page, "07-new-project-questions", { highlights: { create, contractors: page.getByText("How many contractors will work on the project?") } });
  await create.click();
  await page.waitForURL(/\/projects\/[0-9a-f-]{36}$/);
  const projectUrl = page.url();
  await page.getByText("Your tasks").first().waitFor();
  await shot(page, "08-project-created", { highlights: { title: page.getByRole("heading", { level: 1 }) } });

  // 5. Add the team.
  for (const [i, m] of TEAM.entries()) {
    await page.locator("#email").fill(m.email);
    await page.locator("#display_name").fill(m.name);
    await page.locator("#role").selectOption(m.role);
    if (m.discipline) await page.locator("#discipline").selectOption(m.discipline);
    if (m.firm) await page.getByLabel(/held by a firm/).check();
    if (i === 2) {
      await page.locator("#email").scrollIntoViewIfNeeded();
      await page.mouse.wheel(0, 120);
      await shot(page, "09-add-member", { highlights: { form: page.locator("form").filter({ has: page.locator("#email") }), add: page.getByRole("button", { name: "Add to team" }) } });
    }
    await page.getByRole("button", { name: "Add to team" }).click();
    await page.getByText(m.email).first().waitFor();
    await page.waitForTimeout(600);
  }

  // 6. Invite the client and show the team.
  await page.goto(projectUrl);
  const clientRow = page.locator("tr").filter({ hasText: TEAM[0].email });
  await clientRow.getByRole("button", { name: "Invite" }).click();
  await clientRow.locator("input[readonly]").waitFor();
  await blur(page, "input[readonly]");
  const teamCard = page.locator('[data-slot="card"]').filter({ hasText: "Everyone on the project can see this list." });
  await teamCard.scrollIntoViewIfNeeded();
  await shot(page, "10-team-invite", { highlights: { team: teamCard.locator("table"), invite: clientRow } });

  // 7. Everyone's checklists, worked out automatically.
  await page.goto(projectUrl);
  await page.getByText("Each person's duties under Part 2A.").waitFor();
  await shot(page, "11-project-full", { fullPage: true, highlights: {
    checklists: page.getByRole("heading", { name: /Checklists/ }),
    priya: page.locator('[data-slot="card"]').filter({ hasText: "Priya Shah" }).filter({ hasText: "Client ·" }),
    grace: page.locator('[data-slot="card"]').filter({ hasText: "Grace Okafor" }).filter({ hasText: "Designer ·" }),
  } });

  // 8. The dashboard: everyone red, ready to be chased.
  await page.goto(`${projectUrl}/dashboard`);
  await page.getByText("People × duties").waitFor();
  await shot(page, "12-dashboard", { fullPage: true, highlights: {
    progress: page.locator('[data-slot="card"]').filter({ hasText: " done" }).first(),
    // Next keeps hidden copies of earlier pages; only the visible grid counts.
    grid: page.getByRole("table"),
  } });

  writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
  await browser.close();
  // Saved last: editing .env.local makes the dev server reload, which would
  // disturb the two-factor set-up if done mid-flow.
  appendFileSync(path.join(appRoot, ".env.local"),
    `\n# Fictional demo account used to record the project-setup video.\nDEMO_USER_EMAIL=${ALEX.email}\nDEMO_USER_PASSWORD=${password}\nDEMO_USER_TOTP_SECRET=${secret}\n`);
  console.log(`Done. ${Object.keys(manifest.screens).length} screens in ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
