// Screens for the updated project set-up video and the new tracker video,
// from the REAL app (local dev server + dev database) with fictional people.
// Logins come from .env.local and are never printed.
//
// Usage (dev server on :3000, DEV_DATABASE_URL reachable):
//   node scripts/capture-phase11.mjs

import { createHmac, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const rootRequire = createRequire(path.join(appRoot, "package.json"));
const { Client } = rootRequire("pg");
rootRequire("dotenv").config({ path: path.join(appRoot, ".env.local"), quiet: true });

const BASE = "http://localhost:3000";
const SETUP = path.resolve(here, "../videos/project_setup/assets/screens");
const TRACKER = path.resolve(here, "../videos/tracker/assets/screens");
mkdirSync(TRACKER, { recursive: true });
const GRACE_FILE = path.join(tmpdir(), "dutyholder-grace-account.json");
const GRACE = { name: "Grace Okafor", email: "" }; // email read from the team list

function totp(secret) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.replace(/=+$/, "").toUpperCase()].map((c) => alphabet.indexOf(c).toString(2).padStart(5, "0")).join("");
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

const setupManifest = JSON.parse(readFileSync(path.join(SETUP, "manifest.json"), "utf8"));
const trackerManifest = { viewport: { width: 1440, height: 900 }, screens: {} };

async function box(page, locator) {
  const b = await locator.filter({ visible: true }).first().boundingBox();
  if (!b) return null;
  const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  return { x: Math.round(b.x + scroll.x), y: Math.round(b.y + scroll.y), w: Math.round(b.width), h: Math.round(b.height) };
}

async function shot(page, dir, manifest, name, { fullPage = false, highlights = {} } = {}) {
  await page.waitForTimeout(500);
  const file = `${name}.png`;
  await page.screenshot({ path: path.join(dir, file), fullPage });
  const size = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight }));
  const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  const boxes = {};
  for (const [key, loc] of Object.entries(highlights)) boxes[key] = await box(page, loc);
  manifest.screens[name] = {
    file, fullPage, width: fullPage ? size.w : 1440, height: fullPage ? size.h : 900,
    highlights: Object.fromEntries(Object.entries(boxes).map(([k, b]) => [k, b && (fullPage ? b : { ...b, x: b.x - scroll.x, y: b.y - scroll.y })])),
  };
  console.log("captured", file);
}

async function newContext(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: "en-GB", timezoneId: "Europe/London" });
  await context.addInitScript(() => {
    const css = "nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }";
    document.addEventListener("DOMContentLoaded", () => {
      const s = document.createElement("style");
      s.textContent = css;
      document.head.appendChild(s);
    });
  });
  return context.newPage();
}

const settle = (page) => page.waitForLoadState("networkidle");
const visit = async (page, url) => { await page.goto(url); await settle(page); };

async function signIn(page, { email, password, secret }) {
  await visit(page, `${BASE}/?auth=signin`);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.locator("form").filter({ has: page.locator("#password") }).getByRole("button").first().click();
  await page.waitForURL(/mfa\/verify/, { timeout: 30000 });
  await page.reload();
  await settle(page);
  await page.locator("#code").pressSequentially(await freshCode(secret), { delay: 40 });
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/mfa"), { timeout: 30000 });
}

async function signUpGrace(page, db) {
  const { rows: [{ token }] } = await db.query("select public.create_invite($1) as token", [GRACE.email]);
  const password = `Demo-${randomBytes(12).toString("base64url")}`;
  await visit(page, `${BASE}/signup?token=${token}`);
  await page.locator("#name").fill(GRACE.name);
  await page.locator("#password").fill(password);
  await page.locator("#confirm").fill(password);
  await page.locator('input[type="checkbox"]').filter({ visible: true }).first().check();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/mfa\/enrol/, { timeout: 30000 });
  await page.reload();
  await settle(page);
  await page.locator('img[alt^="QR code"]').waitFor();
  const secret = (await page.locator("details code").textContent())?.trim();
  writeFileSync(GRACE_FILE, JSON.stringify({ email: GRACE.email, password, secret }));
  await page.getByLabel(/6-digit code/).pressSequentially(await freshCode(secret), { delay: 40 });
  await page.getByRole("button", { name: "Turn on two-factor" }).click();
  await page.getByText("Save your recovery codes").waitFor();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL(`${BASE}/`, { timeout: 30000 });
}

const card = (page, text) => page.locator('[data-slot="card"]').filter({ hasText: text });

async function captureSetup(page, projectUrl) {
  const s = (name, opts) => shot(page, SETUP, setupManifest, name, opts);
  await visit(page, `${BASE}/`);
  await s("04-home", { highlights: {
    newProject: page.getByRole("main").getByRole("link", { name: "New project" }),
    projects: card(page, "Your projects"),
  } });

  // The form is filled in but not submitted: the project already exists.
  await visit(page, `${BASE}/projects/new`);
  await page.getByLabel("Project name").fill("The Old Mill");
  await page.getByLabel("Site address").fill("Canal Wharf, Leeds");
  await page.locator("#description").fill("Conversion of a three-storey Victorian mill into offices, with a new stair core and rooftop plant.");
  await page.locator("#construction_start_date").fill("2027-03-01");
  await s("05-new-project", { highlights: { name: page.getByLabel("Project name"), description: page.locator("#description") } });

  const info = page.getByRole("button", { name: 'What does "Domestic client" mean?' });
  await info.scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, -120);
  await info.hover();
  await page.getByText("Read more in Help").waitFor();
  await s("06-help-mark", { highlights: { popover: page.locator('[data-slot="popover-content"]'), question: page.getByText("Is the client a domestic client?") } });
  await page.mouse.move(5, 5);

  const create = page.getByRole("button", { name: "Create project" });
  await create.scrollIntoViewIfNeeded();
  await s("07-new-project-questions", { highlights: {
    create, contractors: page.getByText("How many contractors will work on the project?"),
    firstQuestion: page.getByText("Is any of this higher-risk building work?"),
    lastAnswer: page.getByText("More than one (or likely to be)"),
  } });

  await visit(page, projectUrl);
  await s("08-project-created", { highlights: { title: page.getByRole("heading", { level: 1 }), setup: card(page, "Jurisdiction").first() } });

  const form = page.locator("form").filter({ has: page.locator("#email") });
  await page.locator("#email").fill("asha@rao-acoustics.test");
  await page.locator("#display_name").fill("Asha Rao");
  await page.locator("#role").selectOption("designer");
  await page.locator("#discipline").selectOption("other");
  await page.locator("#email").scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 120);
  await s("09-add-member", { highlights: { form, add: page.getByRole("button", { name: "Add to team" }), firm: page.getByText(/held by a firm/) } });

  await visit(page, projectUrl);
  const team = card(page, "Everyone on the project can see this list.");
  await team.scrollIntoViewIfNeeded();
  await s("10-team-invite", { highlights: {
    team: team.locator("table"),
    invite: page.locator("tr").filter({ hasText: "priya" }),
    inviteButton: team.getByRole("button", { name: "Invite" }),
  } });

  await visit(page, projectUrl);
  await page.getByText("Each person's duties under Part 2A.").waitFor();
  await s("11-project-full", { fullPage: true, highlights: {
    checklists: page.getByRole("heading", { name: /Checklists/ }),
    alex: card(page, "Alex Morgan").filter({ hasText: "Principal designer ·" }),
    priya: card(page, "Priya Shah").filter({ hasText: "Client ·" }),
    grace: card(page, "Grace Okafor").filter({ hasText: "Designer ·" }),
  } });

  await visit(page, `${projectUrl}/dashboard`);
  await page.getByText("People × duties").waitFor();
  await s("12-dashboard", { fullPage: true, highlights: {
    stats: page.locator("div.grid").filter({ hasText: "Duties complete" }).filter({ hasText: "Not started" }).last(),
    grid: page.getByRole("table"),
  } });

  await visit(page, `${projectUrl}/dates`);
  await s("13-key-dates", { highlights: {
    heading: page.getByRole("heading", { level: 1 }),
    construction: card(page, "Before and during construction"),
    blocked: page.getByText(/must be signed before construction starts/),
  } });
  writeFileSync(path.join(SETUP, "manifest.json"), JSON.stringify(setupManifest, null, 2));
}

async function captureTracker(alex, grace, projectUrl) {
  const a = (name, opts) => shot(alex, TRACKER, trackerManifest, name, opts);
  const g = (name, opts) => shot(grace, TRACKER, trackerManifest, name, opts);
  const partB = (p) => p.locator(`[id="${encodeURIComponent("Sch.1-Part B")}"]`);

  await visit(alex, `${projectUrl}/tracker?view=all`);
  await a("01-overview", { highlights: {
    heading: alex.getByRole("heading", { level: 1 }),
    grid: card(alex, "Status by Part").locator("table"),
    assign: alex.getByRole("button", { name: "Assign by discipline" }),
  } });

  await alex.getByRole("button", { name: "Assign by discipline" }).click();
  await alex.waitForTimeout(3000);
  await visit(alex, `${projectUrl}/tracker?view=all`);
  const mark = partB(alex).getByRole("button", { name: /unconfirmed as relevant/ });
  if (await mark.count()) { await mark.click(); await alex.waitForTimeout(3000); }
  await visit(alex, `${projectUrl}/tracker?view=all#${encodeURIComponent("Sch.1-Part B")}`);
  await partB(alex).scrollIntoViewIfNeeded();
  await a("02-assigned", { highlights: { partB: partB(alex).locator("ul"), first: partB(alex).locator("li").first() } });

  const e4 = alex.getByRole("link", { name: /^E4/ }).first();
  await e4.click();
  await alex.waitForURL(/tracker\/[0-9a-f-]{36}$/);
  await settle(alex);
  await alex.getByLabel("Not relevant").check();
  await alex.locator("#reason").fill("E4 not relevant: the building is offices, not a school.");
  await alex.locator("form").filter({ has: alex.locator("#reason") }).getByRole("button", { name: "Save" }).click();
  await alex.waitForTimeout(2500);
  await a("03-not-relevant", { highlights: {
    requirement: alex.locator("p.font-serif"),
    decision: card(alex, "Is it relevant to this project?"),
  } });

  await visit(grace, `${projectUrl}/tracker`);
  await g("04-my-requirements", { highlights: { heading: grace.getByRole("heading", { level: 1 }), list: partB(grace).locator("ul") } });

  await grace.getByRole("link", { name: /B1 Means of Warning/ }).first().click();
  await grace.waitForURL(/tracker\/[0-9a-f-]{36}$/);
  await settle(grace);
  const answer = grace.locator("form").filter({ has: grace.locator("#project_application") });
  await grace.locator("#route").selectOption("approved_document");
  await grace.locator("#status").selectOption("ready_for_submission");
  await grace.locator("#guidance").fill("Approved Document B Volume 2, 2019 edition");
  await grace.locator("#project_application").fill("Category L2 alarm to BS 5839-1 across all three storeys. Two protected stairs, including the new stair core. Travel distances as shown in the fire strategy report, revision B.");
  await answer.getByRole("button", { name: "Save" }).click();
  await answer.getByText("Saved").waitFor({ timeout: 20000 });
  await answer.scrollIntoViewIfNeeded();
  await g("05-answer", { highlights: { answer, application: grace.locator("#project_application") } });

  await visit(alex, `${projectUrl}/tracker?view=all`);
  await a("06-progress", { highlights: { grid: card(alex, "Status by Part").locator("table"), summary: card(alex, "Status by Part").getByText(/to confirm ·/) } });

  await visit(alex, `${projectUrl}/exports`);
  const create = alex.getByRole("button", { name: "Create evidence pack" });
  await create.click();
  const download = alex.getByRole("link", { name: /Download/ }).first();
  for (let i = 0; i < 30 && !(await download.count()); i++) {
    await alex.waitForTimeout(4000);
    await alex.reload();
    await settle(alex);
  }
  await download.waitFor({ timeout: 10000 });
  await a("07-evidence", { highlights: { create: alex.getByRole("button", { name: "Create evidence pack" }), download } });
  writeFileSync(path.join(TRACKER, "manifest.json"), JSON.stringify(trackerManifest, null, 2));
}

async function main() {
  const db = new Client({ connectionString: process.env.DEV_DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await db.connect();
  const owner = { email: process.env.DEMO_USER_EMAIL, password: process.env.DEMO_USER_PASSWORD, secret: process.env.DEMO_USER_TOTP_SECRET };
  const { rows: [project] } = await db.query(
    `select m.project_id from public.project_members m join public.projects p on p.id = m.project_id
     where lower(m.email) = lower($1) and m.is_owner and p.name = 'The Old Mill' and m.removed_at is null order by p.created_at desc limit 1`, [owner.email]);
  if (!project) throw new Error("The demo account has no project called The Old Mill.");
  const { rows: [member] } = await db.query("select email from public.project_members where project_id = $1 and email like 'grace%'", [project.project_id]);
  if (!member) throw new Error("Grace isn't on this project.");
  GRACE.email = member.email;
  const { rows: graceUser } = await db.query("select id from auth.users where lower(email) = $1", [GRACE.email]);
  const projectUrl = `${BASE}/projects/${project.project_id}`;

  const browser = await chromium.launch();
  const alex = await newContext(browser);
  const grace = await newContext(browser);
  try {
    await signIn(alex, owner);
    await captureSetup(alex, projectUrl);
    if (graceUser.length) {
      if (!existsSync(GRACE_FILE)) throw new Error("Grace has an account but her saved login is missing.");
      await signIn(grace, JSON.parse(readFileSync(GRACE_FILE, "utf8")));
    } else {
      await signUpGrace(grace, db);
    }
    await visit(grace, `${BASE}/account`);
    // Accept every waiting invitation: earlier recordings left more than one "The Old Mill".
    for (let i = 0; i < 5 && await grace.getByRole("button", { name: "Accept" }).count(); i++) {
      await grace.getByRole("button", { name: "Accept" }).first().click();
      await grace.waitForTimeout(3000);
      await visit(grace, `${BASE}/account`);
    }
    await captureTracker(alex, grace, projectUrl);
  } catch (err) {
    await alex.screenshot({ path: path.join(tmpdir(), "dutyholder-capture-alex.png"), fullPage: true }).catch(() => {});
    await grace.screenshot({ path: path.join(tmpdir(), "dutyholder-capture-grace.png"), fullPage: true }).catch(() => {});
    throw err;
  } finally {
    await browser.close();
    await db.end();
  }
}

main().catch((err) => { console.error(String(err.message).split("\n")[0]); process.exit(1); });
