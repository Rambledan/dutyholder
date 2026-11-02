// Records the dutyholder's side of Dutyholder in the REAL app (local dev
// server + dev database): Tom Ellis, a structural designer on "The Old Mill",
// gets an invite, creates an account and works through his tasks.
// Run capture-app.mjs first (it creates Alex and the project).
//
// Usage (dev server running on :3000):
//   node scripts/capture-dutyholder.mjs
// Output: videos/dutyholder_tasks/assets/screens/*.png + manifest.json

import { createHmac, randomBytes } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire, stripTypeScriptTypes } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "../..");
const rootRequire = createRequire(path.join(appRoot, "package.json"));
const { Client } = rootRequire("pg");

const BASE = "http://localhost:3000";
const OUT = path.resolve(here, "../videos/dutyholder_tasks/assets/screens");
const WORK = path.join(tmpdir(), "dutyholder-capture");
mkdirSync(OUT, { recursive: true });
mkdirSync(WORK, { recursive: true });

const ALEX = JSON.parse(readFileSync(path.join(tmpdir(), "dutyholder-demo-account.json"), "utf8"));
const TOM = { name: "Tom Ellis", email: "tom.ellis@ellis-structures.example", company: "Ellis Structures", title: "Director, Structural Engineer" };

// Fictional answers, written as a structural engineer would.
const ANSWERS = {
  skills: "Structural design of steel, concrete and masonry frames. Assessment of existing structures, including cast-iron and timber floors. Analysis in Tekla Structural Designer, and site inspection of temporary works.",
  knowledge: "Approved Documents A and B (structural fire), Eurocodes 0 to 3 and 6 with the UK National Annexes, and BS 449 / BS 5950 for assessing existing frames. 32 hours of CPD this year, including the Building Safety Act changes.",
  experience: "Lead structural engineer on four mill conversions in West Yorkshire since 2019, including a five-storey wool mill converted to offices with a new steel stair core (2023).",
  behaviour_compliance: "I would refuse the work, explain in writing which requirement it would breach, and raise it with the principal designer and the client straight away.",
  behaviour_cooperation: "Fortnightly design coordination meetings, a shared model and drawing register, and replies to RFIs within two working days.",
  behaviour_limits: "I check the scope against my experience before accepting an appointment, and bring in specialists for anything outside it, such as geotechnical or facade design.",
};

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

// The app's own invite email template (src/lib/invite-email.ts), compiled on
// the fly so the video shows exactly what invitees receive.
async function loadInviteEmail() {
  const compile = (file, map) => {
    let src = readFileSync(path.join(appRoot, file), "utf8").replace(/^import "server-only";\n/m, "");
    for (const [from, to] of Object.entries(map)) src = src.replaceAll(`"${from}"`, `"${to}"`);
    return stripTypeScriptTypes(src);
  };
  writeFileSync(path.join(WORK, "email.mjs"), compile("src/lib/email.ts", {}));
  writeFileSync(path.join(WORK, "labels.mjs"), compile("src/lib/labels.ts", {}));
  writeFileSync(path.join(WORK, "invite-email.mjs"), compile("src/lib/invite-email.ts", { "@/lib/email": "./email.mjs", "@/lib/labels": "./labels.mjs" }));
  return (await import(path.join(WORK, "invite-email.mjs"))).inviteEmail;
}

// Three-line PDF, so the evidence uploads are real files.
function samplePdf(title) {
  const text = `BT /F1 20 Tf 72 720 Td (${title}) Tj 0 -30 Td /F1 12 Tf (Sample document for a product demo. Not a real certificate.) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = objs.map((o, i) => { const at = pdf.length; pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; return at; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

const manifestPath = path.join(OUT, "manifest.json");
let manifest = { viewport: { width: 1440, height: 900 }, screens: {} };

async function shot(page, name, { fullPage = false, highlights = {} } = {}) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage });
  const size = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, sy: window.scrollY }));
  const boxes = {};
  for (const [key, loc] of Object.entries(highlights)) {
    // Next keeps hidden copies of earlier pages; only measure what's visible.
    const b = await loc.filter({ visible: true }).first().boundingBox();
    // Boxes are viewport-relative; full-page shots need page coordinates.
    boxes[key] = b && { x: Math.round(b.x), y: Math.round(b.y + (fullPage ? size.sy : 0)), w: Math.round(b.width), h: Math.round(b.height) };
  }
  manifest.screens[name] = { file: `${name}.png`, fullPage, width: 1440, height: fullPage ? size.h : 900, highlights: boxes };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log("captured", name);
}

const blur = (page, selector) =>
  page.evaluate((sel) => document.querySelectorAll(sel).forEach((el) => { el.style.filter = "blur(10px)"; }), selector);

async function newContext(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: "en-GB", timezoneId: "Europe/London" });
  await context.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const s = document.createElement("style");
      s.textContent = "nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }";
      document.head.appendChild(s);
    });
  });
  return context;
}

async function main() {
  const db = new Client({ connectionString: (rootRequire("dotenv").config({ path: path.join(appRoot, ".env.local"), quiet: true }), process.env.DEV_DATABASE_URL), ssl: { rejectUnauthorized: false } });
  await db.connect();
  const { rows: existing } = await db.query("select id from auth.users where lower(email) = $1", [TOM.email]);
  await db.end();
  // A run that stopped after Tom signed up carries on from his task list.
  const resume = existing.length > 0;
  if (resume) manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

  const browser = await chromium.launch();
  let page;
  let projectId;
  if (resume) {
    const tom = JSON.parse(readFileSync(path.join(tmpdir(), "dutyholder-demo-tom.json"), "utf8"));
    page = await (await newContext(browser)).newPage();
    await page.goto(`${BASE}/login`);
    await page.getByLabel("Email").fill(tom.email);
    await page.getByLabel("Password").fill(tom.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/mfa\/verify/);
    await page.locator("#code").fill(await freshCode(tom.secret));
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(`${BASE}/`);
    await page.getByRole("link", { name: /The Old Mill/ }).click();
    await page.waitForURL(/\/projects\/[0-9a-f-]{36}/);
    projectId = page.url().match(/projects\/([0-9a-f-]{36})/)[1];
    await page.goto(`${BASE}/projects/${projectId}/tasks`);
  } else {
    ({ page, projectId } = await signUpTom(browser));
  }
  await tasks(page, projectId);
  await browser.close();
  console.log(`Done. ${Object.keys(manifest.screens).length} screens in ${OUT}`);
}

async function signUpTom(browser) {
  const inviteEmail = await loadInviteEmail();

  // 1. Alex invites Tom (the link appears because email isn't verified yet).
  const alexCtx = await newContext(browser);
  const alex = await alexCtx.newPage();
  await alex.goto(`${BASE}/login`);
  await alex.getByLabel("Email").fill(ALEX.email);
  await alex.getByLabel("Password").fill(ALEX.password);
  await alex.getByRole("button", { name: "Sign in" }).click();
  await alex.waitForURL(/mfa\/verify/);
  await alex.locator("#code").fill(await freshCode(ALEX.secret));
  await alex.getByRole("button", { name: "Continue" }).click();
  await alex.waitForURL(`${BASE}/`);
  await alex.getByRole("link", { name: /The Old Mill/ }).click();
  await alex.waitForURL(/\/projects\/[0-9a-f-]{36}/);
  const projectId = alex.url().match(/projects\/([0-9a-f-]{36})/)[1];
  await alex.goto(`${BASE}/projects/${projectId}`);
  const row = alex.locator("tr").filter({ hasText: TOM.email });
  await row.getByRole("button", { name: "Invite" }).click();
  const link = new URL(await row.locator("input[readonly]").inputValue());
  const inviteUrl = `${BASE}${link.pathname}${link.search}`;
  await alexCtx.close();

  // 2. The email Tom receives, shown in a plain mail window.
  const page = await (await newContext(browser)).newPage();
  const message = inviteEmail({ ownerName: "Alex Morgan", projectName: "The Old Mill", role: "designer", link: inviteUrl });
  await page.setContent(`<!doctype html><html><head><style>
    body { margin: 0; background: #f5f5f4; font-family: -apple-system, "Segoe UI", Arial, sans-serif; color: #171717; }
    .mail { width: 880px; margin: 48px auto; background: #fff; border: 1px solid #e7e5e4; border-radius: 14px; overflow: hidden; }
    .head { padding: 28px 40px 20px; border-bottom: 1px solid #e7e5e4; }
    .subject { font-size: 24px; font-weight: 600; margin: 0 0 16px; }
    .meta { font-size: 14px; color: #525252; line-height: 1.7; }
    .meta b { color: #171717; font-weight: 600; }
    .body { padding: 28px 40px 36px; }
  </style></head><body><div class="mail">
    <div class="head"><p class="subject">${message.subject}</p>
      <div class="meta"><b>From</b> Alex Morgan via Dutyholder<br/><b>To</b> ${TOM.email}<br/><b>Date</b> 2 November 2026, 09:14</div></div>
    <div class="body">${message.html}</div></div></body></html>`);
  await shot(page, "01-email", { highlights: {
    mail: page.locator(".mail"),
    accept: page.getByRole("link", { name: "Accept invite" }),
    why: page.getByText(/Under Part 2A/),
  } });

  // 3. Create an account from the invite.
  const password = `Demo-${randomBytes(12).toString("base64url")}`;
  await page.goto(inviteUrl);
  await page.getByLabel("Full name").fill(TOM.name);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page.getByRole("checkbox").check();
  await shot(page, "02-signup", { highlights: { form: page.locator("form"), email: page.getByLabel("Email"), create: page.getByRole("button", { name: "Create account" }) } });
  await page.getByRole("button", { name: "Create account" }).click();

  // 4. Two-factor login.
  await page.waitForURL(/\/mfa\/enrol/);
  await page.locator('img[alt^="QR code"]').waitFor();
  const secret = (await page.locator("details code").textContent())?.trim();
  writeFileSync(path.join(tmpdir(), "dutyholder-demo-tom.json"), JSON.stringify({ email: TOM.email, password, secret }));
  await blur(page, 'img[alt^="QR code"], details code');
  await page.getByLabel(/6-digit code/).fill(await freshCode(secret));
  await shot(page, "03-two-factor", { highlights: { qr: page.locator('img[alt^="QR code"]'), code: page.getByLabel(/6-digit code/) } });
  await page.getByRole("button", { name: "Turn on two-factor" }).click();
  await page.getByText("Save your recovery codes").waitFor();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.waitForURL(/\/tasks$/);
  return { page, projectId };
}

async function tasks(page, projectId) {
  // 5. Straight to his tasks on the project.
  await page.getByRole("heading", { name: /Your tasks/ }).waitFor();
  await shot(page, "04-tasks", { highlights: {
    progress: page.locator("header").filter({ hasText: "Your tasks" }),
    start: page.getByRole("link", { name: /^Start:/ }),
    list: page.locator("ul.divide-y").last(),
  } });
  await page.getByRole("link", { name: /^Start:/ }).click();

  // 6. First acknowledgement: read the duty, tick, type name, sign.
  const ack = async (name) => {
    await page.waitForURL(/\/tasks\/[0-9a-f-]{36}$/);
    await page.getByLabel(/Type your full name to sign/).waitFor();
    await page.getByRole("checkbox").check();
    await page.getByLabel(/Type your full name to sign/).fill(TOM.name);
    if (name) await shot(page, name, { highlights: {
      title: page.locator('[data-slot="card-header"]'),
      duty: page.locator('[data-slot="card-description"]'),
      confirm: page.getByText("I confirm I have read and understood"),
      sign: page.getByLabel(/Type your full name to sign/),
      button: page.getByRole("button", { name: "Sign and continue" }),
    } });
    const url = page.url();
    await page.getByRole("button", { name: "Sign and continue" }).click();
    await page.waitForURL((u) => u.toString() !== url);
  };
  await ack("05-acknowledge");

  // 7. Competence statement.
  await page.getByLabel("What skills do you bring to this work?").waitFor();
  await shot(page, "06-competence-top", { highlights: {
    title: page.locator('[data-slot="card-header"]'),
    skills: page.locator("#skills"),
  } });
  for (const [key, value] of Object.entries(ANSWERS)) await page.locator(`#${key}`).fill(value);
  const files = ["Chartered membership certificate.pdf", "Professional indemnity insurance 2026-27.pdf"];
  await page.locator('input[type="file"]').setInputFiles(files.map((name) => ({ name, mimeType: "application/pdf", buffer: samplePdf(name.replace(".pdf", "")) })));
  for (const f of files) await page.getByText(f).first().waitFor({ timeout: 30000 });
  await page.getByText(/Saved/).first().waitFor({ timeout: 15000 }).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, "07-competence-full", { fullPage: true, highlights: {
    intro: page.getByText("This statement belongs to you"),
    skills: page.locator("#skills"),
    knowledge: page.locator("#knowledge"),
    experience: page.locator("#experience"),
    behaviours: page.locator("#behaviour_compliance"),
    limits: page.locator("#behaviour_limits"),
    evidence: page.getByRole("heading", { name: "Evidence" }),
    files: page.getByText(files[0]).first(),
    submit: page.getByRole("button", { name: "Submit for review" }),
  } });
  const before = page.url();
  await page.getByRole("button", { name: "Submit for review" }).click();
  await page.waitForURL((u) => u.toString() !== before);

  // 8. The remaining acknowledgements.
  await ack("08-report-change");
  await ack(null);

  // 9. All done.
  await page.goto(`${BASE}/projects/${projectId}/tasks`);
  await page.getByText("You're done for now").waitFor();
  await shot(page, "09-tasks-done", { highlights: {
    done: page.getByText("You're done for now"),
    list: page.locator("ul.divide-y").last(),
  } });

  // 10. Saved details, reusable on other projects.
  await page.goto(`${BASE}/account`);
  await page.getByLabel("Company").fill(TOM.company);
  await page.getByLabel("Job title").fill(TOM.title);
  await page.getByRole("button", { name: "Save details" }).click();
  await page.getByText("Saved.").waitFor();
  await shot(page, "10-account", { fullPage: true, highlights: {} });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
