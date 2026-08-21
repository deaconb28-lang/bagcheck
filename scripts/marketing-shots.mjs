#!/usr/bin/env node
/**
 * The two handsets on the landing hero, captured from the real app.
 *
 *   npm run build && npm run marketing:shots
 *
 * They were drawn in JSX — an illustration of the dashboard, kept in step with
 * it by hand, which is a thing nobody does. The dashboard led with the score
 * for months while the phone on the landing page still showed an account
 * balance and a holdings list, so the page was advertising a screen the
 * product had stopped being.
 *
 * So they are photographs of the product now: `next start` against the same
 * seeded in-memory database the sweep uses, Chromium at a handset viewport,
 * two PNGs into `public/marketing`. Committed, because a landing page must not
 * depend on a screenshot service, and deliberate, because a capture that ran
 * on every build would rewrite two binaries in every commit.
 *
 * **The ledger behind them is the seed's, and it is fictional.** It is the same
 * example account `/wrapped?demo=1` serves, so nothing here is a real person's
 * positions on a public page — which is the one thing a screenshot on a
 * marketing site must never be.
 */

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { seed } from "./seed.mjs";

const OUT = new URL("../public/marketing/", import.meta.url);
const PORT = 3124;
const BASE = `http://localhost:${PORT}`;
const CHROME = "/opt/pw-browsers/chromium";

/*
 * A handset, at the size the mock draws one. 2× so the image still resolves on
 * a retina display at the ~300px the phone renders at, and no larger: these
 * ship to every visitor.
 */
const VIEWPORT = { width: 390, height: 844 };

const SHOTS = [
  {
    file: "app-dash.png",
    path: "/you",
    /*
     * The dashboard's own top: the notice, the dial, the archetype and the
     * four components. Clipped rather than full-page, because the phone frame
     * shows one screen and a 6,000px column scaled into it is a grey smear.
     */
    clip: { x: 0, y: 0, width: 390, height: 844 },
    /*
     * Past the notice, so the frame holds the read.
     *
     * The dashboard's first block is the "your year is ready" notice, which is
     * the right thing to lead a real session with and the wrong thing to put in
     * a 300px marketing mock — the hero is selling the instrument, and the
     * instrument is the dial, the number and the archetype. Far enough to
     * clear the notice and no further: at 300 the top of the dial went out of
     * frame, and a gauge cropped through its own arc reads as a mistake.
     */
    scroll: 214,
  },
  {
    file: "app-wrapped.png",
    path: "/wrapped?demo=1",
    clip: { x: 0, y: 0, width: 390, height: 844 },
  },
];

function serve(uri, userId) {
  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", String(PORT)],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: String(PORT),
        APP_LOCKED: "",
        APP_URL: BASE,
        MONGODB_URI: uri,
        MONGODB_DB: "supercruise",
        FINNHUB_API_KEY: "seeded-cache-only",
        DEV_USER_ID: userId,
        AUTH_SECRET: "",
        AUTH_GOOGLE_ID: "",
        AUTH_GOOGLE_SECRET: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
      detached: true,
    },
  );
  child.stdout.on("data", () => {});
  child.stderr.on("data", (d) => process.stderr.write(`[next] ${d}`));
  return child;
}

async function waitFor(url, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 307 || res.status === 308) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

await mkdir(OUT, { recursive: true });

console.log("seeding…");
const { mongod, uri, userId } = await seed({ quiet: true });

console.log("starting the app…");
const server = serve(uri, userId);

let browser = null;
async function teardown() {
  try {
    if (browser?.isConnected()) await browser.close();
  } catch { /* already gone */ }
  try {
    process.kill(-server.pid, "SIGKILL");
  } catch { /* already gone */ }
  try {
    await mongod.stop();
  } catch { /* already gone */ }
}
process.on("SIGINT", async () => { await teardown(); process.exit(130); });

if (!(await waitFor(`${BASE}/`))) {
  await teardown();
  throw new Error("the app never came up");
}

browser = await chromium.launch({ executablePath: CHROME });

for (const shot of SHOTS) {
  const page = await browser.newPage({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });
  await page.addInitScript(`
    try { localStorage.setItem("supercruise-mode", "dark"); } catch {}
    document.addEventListener("DOMContentLoaded", () => {
      document.documentElement.dataset.mode = "dark";
    });
  `);
  await page.goto(BASE + shot.path, { waitUntil: "networkidle", timeout: 90000 });
  /*
   * Every arrival on these screens is under 900ms and the count-ups tween
   * backwards into place, so a capture taken on load photographs a figure
   * mid-count. One second is past all of them.
   */
  await page.waitForTimeout(1400);
  if (shot.scroll) {
    await page.evaluate((y) => window.scrollTo(0, y), shot.scroll);
    /* One frame for the sticky bar to settle before the shutter. */
    await page.waitForTimeout(400);
  }
  const out = fileURLToPath(new URL(shot.file, OUT));
  await page.screenshot({ path: out, clip: shot.clip });
  await page.close();
  console.log(`  ${shot.file}  ${shot.path}`);
}

await teardown();
console.log(`\n${SHOTS.length} handsets written to public/marketing/`);
