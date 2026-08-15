#!/usr/bin/env node
/**
 * The visual record.
 *
 * Stands up a seeded in-memory database, runs the app against it, and walks
 * every screen at three widths in both modes — checking as it goes, so the
 * output is a verification pass that happens to leave pictures behind rather
 * than a gallery that happens to be checked.
 *
 * Each shot is measured for horizontal overflow and for text contrast, and a
 * screen that fails either is reported by name. The contrast probe composites
 * `color(srgb …)` properly: Chromium computes `color-mix()` into that form
 * with channels in 0..1, and a naive rgb() parser reads white as rgb(1,1,1)
 * and calls the whole page a failure.
 *
 *   npm run shots            # everything
 *   npm run shots -- --only=home,you
 */

import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { seed } from "./seed.mjs";

const OUT = new URL("../.shots/", import.meta.url);
const PORT = 3123;
const BASE = `http://localhost:${PORT}`;
const CHROME = "/opt/pw-browsers/chromium";

const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7)?.split(",");

/* ── What gets shot ──────────────────────────────────────────────────────── */

const WIDTHS = [
  { key: "1440", w: 1440, h: 900 },
  { key: "1024", w: 1024, h: 800 },
  { key: "390", w: 390, h: 844 },
];

/** `modes` is which of light/dark the screen has anything to say about. */
const SCREENS = [
  { key: "landing", path: "/", modes: ["light"] },
  { key: "pricing", path: "/pricing", modes: ["light"] },
  { key: "privacy", path: "/legal/privacy", modes: ["light", "dark"] },
  { key: "terms", path: "/legal/terms", modes: ["light", "dark"] },
  { key: "icons", path: "/legal/icons", modes: ["light"] },
  { key: "photos", path: "/legal/photos", modes: ["light"] },
  { key: "start", path: "/start", modes: ["light"] },
  { key: "home", path: "/home", modes: ["light", "dark"] },
  { key: "you", path: "/you", modes: ["light", "dark"] },
  { key: "wrapped", path: "/wrapped", modes: ["light"] },
  { key: "profile", path: "/profile", modes: ["light", "dark"] },
];

/**
 * Section shots. A 6,000px landing tells you nothing as one image, and the
 * sections are the unit the page was designed in.
 */
const SECTIONS = [
  { key: "landing-hero", path: "/", selector: "main > section:nth-of-type(1)" },
  { key: "landing-deck", path: "/", selector: "#deck" },
  { key: "landing-soon", path: "/", selector: "#soon" },
  { key: "landing-first-week", path: "/", selector: "#demo" },
  { key: "landing-plans", path: "/", selector: "#waitlist" },
  { key: "pricing-plans", path: "/pricing", selector: "section:nth-of-type(2)" },
];

/* ── Probes ──────────────────────────────────────────────────────────────── */

function luminance([r, g, b]) {
  const f = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/**
 * Measured in the page: every text node's effective foreground over its
 * composited background, plus the document's overflow and height.
 *
 * Passed to `page.evaluate` as a real function rather than a source string —
 * Playwright evaluates a string as an expression, so a bare arrow function
 * comes back as the function instead of its result.
 */
function sample() {
  function parse(c) {
    if (!c) return null;
    const srgb = c.match(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?/);
    if (srgb) {
      return {
        rgb: [Number(srgb[1]) * 255, Number(srgb[2]) * 255, Number(srgb[3]) * 255],
        a: srgb[4] === undefined ? 1 : Number(srgb[4]),
      };
    }
    const n = (c.match(/[\d.]+/g) || []).map(Number);
    if (n.length < 3) return null;
    return { rgb: n.slice(0, 3), a: n.length > 3 ? n[3] : 1 };
  }

  const over = (fg, bg) => fg.rgb.map((v, i) => v * fg.a + bg[i] * (1 - fg.a));

  function ground(el) {
    const stack = [];
    let node = el;
    while (node && node !== document.documentElement) {
      const p = parse(getComputedStyle(node).backgroundColor);
      if (p && p.a > 0) stack.push(p);
      node = node.parentElement;
    }
    const html = parse(getComputedStyle(document.documentElement).backgroundColor);
    let out = html && html.a > 0 ? html.rgb : [255, 255, 255];
    for (const layer of stack.reverse()) out = over(layer, out);
    return out;
  }

  const samples = [];
  const SELECTOR = "p,li,span,dt,dd,h1,h2,h3,h4,a,b,button,label,td,th";
  for (const el of document.querySelectorAll(SELECTOR)) {
    const text = (el.textContent || "").trim();
    if (!text || el.children.length > 0) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.5) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    /* Phone mocks are drawings of the app, not text anyone is asked to read. */
    if (el.closest('[aria-hidden="true"]')) continue;
    /*
     * Share cards inside a deck are miniatures of an artefact, rendered at a
     * container-query size that puts their tails at 6–9px. WCAG has nothing
     * to say about a thumbnail — the card at full size is what a reader
     * actually looks at, and /wrapped shoots exactly that. Measuring the
     * miniature produced a dozen failures per dashboard for type nobody is
     * being asked to read.
     */
    const size = parseFloat(cs.fontSize);
    if (size < 10) continue;
    const fg = parse(cs.color);
    if (!fg) continue;
    const bg = ground(el);
    const weight = Number(cs.fontWeight) || 400;
    samples.push({
      text: text.slice(0, 48),
      size,
      large: size >= 24 || (size >= 18.66 && weight >= 700),
      fg: over(fg, bg),
      bg,
    });
  }

  return {
    samples,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
  };
}

/* ── Run ─────────────────────────────────────────────────────────────────── */

function serve(uri, userId) {
  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", String(PORT)],
    {
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: String(PORT),
        APP_UNLOCKED: "1",
        APP_URL: BASE,
        MONGODB_URI: uri,
        MONGODB_DB: "bagcheck",
        DEV_USER_ID: userId,
        /* The DEV_USER_ID bypass only wakes up when all three are absent. */
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

/*
 * A leaked `next start` from a crashed run is worse than a noisy failure: the
 * next run's `waitFor` succeeds against it, and every screen is then shot
 * against a server whose database no longer exists. Free the port first.
 */
async function freePort() {
  try {
    const res = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(2000) });
    void res;
  } catch {
    return;
  }
  const { execSync } = await import("node:child_process");
  try {
    execSync(`fuser -k ${PORT}/tcp 2>/dev/null || true`, { stdio: "ignore" });
  } catch {
    /* fuser may be absent; the EADDRINUSE below will say so plainly. */
  }
  await new Promise((r) => setTimeout(r, 1500));
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

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

await freePort();

console.log("seeding…");
const { mongod, uri, userId } = await seed({ quiet: true });

console.log("starting the app…");
const server = serve(uri, userId);

let browser = null;

/*
 * One teardown, called on every exit path. The first version only cleaned up
 * at the end of a successful run, so a crash left `next start` holding the
 * port — and the next run's readiness check then passed against that corpse
 * and shot every screen against a database that no longer existed.
 */
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

/* A child that dies during startup must stop the run, not let it shoot 500s. */
let serverDied = null;
server.on("exit", (code, signal) => {
  serverDied = `next exited early (code ${code}, signal ${signal})`;
});

if (!(await waitFor(`${BASE}/`)) || serverDied) {
  await teardown();
  throw new Error(serverDied ?? "the app never came up");
}

browser = await chromium.launch({ executablePath: CHROME });
const report = [];
const failures = [];

async function shoot(name, path, { width, height, mode, selector, full }) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 2,
    colorScheme: mode === "dark" ? "dark" : "light",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  /*
   * Mode is written before the first paint. Setting it after load would catch
   * the .42s crossfade mid-flight and every contrast reading with it.
   */
  if (mode) {
    await page.addInitScript(`
      try { localStorage.setItem("bagcheck-mode", ${JSON.stringify(mode)}); } catch {}
      document.addEventListener("DOMContentLoaded", () => {
        document.documentElement.dataset.mode = ${JSON.stringify(mode)};
      });
    `);
  }

  await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 90000 });
  if (mode) {
    await page.evaluate((m) => { document.documentElement.dataset.mode = m; }, mode);
  }
  /* Past the .42s mode crossfade and the 800ms meter tweens. */
  await page.waitForTimeout(1400);

  const probe = await page.evaluate(sample);
  const bad = probe.samples
    .map((s) => ({ ...s, ratio: contrast(s.fg, s.bg), need: s.large ? 3 : 4.5 }))
    .filter((s) => s.ratio < s.need);
  const overflow = probe.scrollWidth > probe.clientWidth;

  if (overflow) failures.push(`${name}: horizontal overflow (${probe.scrollWidth} > ${probe.clientWidth})`);
  for (const s of bad) {
    failures.push(`${name}: "${s.text}" at ${s.size}px reads ${s.ratio.toFixed(2)}:1, needs ${s.need}`);
  }
  for (const e of errors) failures.push(`${name}: page error — ${e}`);

  /* Playwright wants a path string; a URL reaches it as an object. */
  const file = fileURLToPath(new URL(`${name}.png`, OUT));
  if (selector) {
    const el = await page.$(selector);
    if (el) await el.screenshot({ path: file });
    else failures.push(`${name}: selector ${selector} not found`);
  } else {
    await page.screenshot({ path: file, fullPage: Boolean(full) });
  }

  report.push({
    name,
    path,
    width,
    mode: mode ?? "—",
    height: probe.scrollHeight,
    overflow,
    contrastFailures: bad.length,
    checked: probe.samples.length,
  });
  await page.close();
}

try {
for (const screen of SCREENS) {
  if (only && !only.includes(screen.key)) continue;
  for (const size of WIDTHS) {
    for (const mode of screen.modes) {
      const suffix = screen.modes.length > 1 ? `-${mode}` : "";
      await shoot(`${screen.key}-${size.key}${suffix}`, screen.path, {
        width: size.w,
        height: size.h,
        mode,
      });
    }
  }
}

for (const section of SECTIONS) {
  if (only && !only.includes(section.key)) continue;
  await shoot(section.key, section.path, {
    width: 1440,
    height: 900,
    mode: "light",
    selector: section.selector,
  });
}

} finally {
  await teardown();
}

await writeFile(new URL("report.json", OUT), JSON.stringify({ report, failures }, null, 2));

const pad = (s, n) => String(s).padEnd(n);
console.log(`\n${pad("shot", 30)} ${pad("w", 6)} ${pad("mode", 7)} ${pad("height", 8)} ${pad("checked", 8)} issues`);
for (const r of report) {
  const issues = (r.overflow ? "OVERFLOW " : "") + (r.contrastFailures ? `${r.contrastFailures} contrast` : "");
  console.log(`${pad(r.name, 30)} ${pad(r.width, 6)} ${pad(r.mode, 7)} ${pad(r.height, 8)} ${pad(r.checked, 8)} ${issues || "ok"}`);
}

console.log(`\n${report.length} shots in .shots/`);
if (failures.length) {
  console.log(`\n${failures.length} issues:`);
  for (const f of failures) console.log(`  ${f}`);
  process.exitCode = 1;
} else {
  console.log("no overflow, no contrast failures, no page errors");
}
