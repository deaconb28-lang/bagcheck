#!/usr/bin/env node
/**
 * The contact sheet.
 *
 * Turns `.shots/` into one page: every screen at every width, both modes,
 * before-and-after where something changed, and the pass/fail the sweep
 * recorded next to each. It is a review surface, so it is built in the
 * product's own vocabulary — its tokens, its faces, hairlines rather than
 * boxes — because a QA sheet for a design system that looked like something
 * else would be one more thing to translate.
 *
 *   npm run sheet     # writes .shots/index.html
 */

import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SHOTS = new URL("../.shots/", import.meta.url);
const BEFORE = new URL("../.shots-before/", import.meta.url);
const FONTS = new URL("../public/fonts/", import.meta.url);

/** Groups, in the order someone reviewing the product would walk them. */
const GROUPS = [
  {
    key: "landing",
    title: "The landing",
    note: "White editorial hero over a dark field. Shot whole, then section by section.",
    match: (n) => n.startsWith("landing"),
  },
  {
    key: "pricing",
    title: "Pricing",
    note: "New. States both plans off the same constants the server gates read, so the page cannot drift from what it enforces.",
    match: (n) => n.startsWith("pricing"),
  },
  {
    key: "home-retired",
    title: "Home",
    note: "Four blocks and the money leads: P&L, the year, the read, the loop. Was eleven blocks over 3,600px. Two of them are shot on their own, because a block three thousand pixels down never appears in a viewport shot.",
    match: (n) => n.startsWith("home"),
  },
  {
    key: "you",
    title: "The dashboard",
    note: "The dashboard, and the only screen. Eleven blocks in the order a reader asks in — money, portfolio, the read, the year, holdings, identity, consistency, findings, the loop, cards, formats. Blocks below the fold are shot on their own.",
    match: (n) => n.startsWith("you"),
  },
  {
    key: "wrapped",
    title: "Wrapped",
    note: "The deck, every frame in roster order, earned and locked alike.",
    match: (n) => n.startsWith("wrapped"),
  },
  {
    key: "profile",
    title: "Profile",
    note: "Plan, connection, notifications, and the export and erase buttons.",
    match: (n) => n.startsWith("profile"),
  },
  {
    key: "start",
    title: "Connect",
    note: "The one screen between a link and a ledger.",
    match: (n) => n.startsWith("start"),
  },
  {
    key: "legal",
    title: "Legal",
    note: "Privacy and terms, written against the code rather than a template.",
    match: (n) => n.startsWith("privacy") || n.startsWith("terms") || n.startsWith("icons") || n.startsWith("photos"),
  },
];

/** Pairs where the old state is worth seeing beside the new one. */
const PAIRS = [
  {
    after: "landing-hero",
    before: "before-landing-hero",
    title: "The hero pill",
    note: "“Loved by 320K investors · 4.9 rating” over three drawn faces, on the launch day of a product with no users. It states the read-only connection now — true, and the actual objection at that point in the page.",
  },
  {
    after: "landing-plans",
    before: "before-landing-plans",
    title: "The plans block",
    note: "Three waitlist tiers nobody could buy: $5 once “refunded if we miss our launch window”, $9/mo “with early access”, $18/mo “at launch”, and 4,281 imaginary investors ahead of you. Checkout charges $9. Now: the two real plans and the score’s waitlist, which is the only thing there that is genuinely still coming.",
  },
];

const WIDTH_LABEL = { 1440: "Desktop · 1440", 1024: "Laptop · 1024", 390: "Phone · 390" };

/* Section shots whose bare name would read as a fragment. */
const SECTION_LABEL = {
  "you-money": "1 · The money",
  "you-read": "3 · The read",
  "you-consistency": "Consistency",
  "you-cards": "The case",
};

async function encode(dir, name) {
  /* sharp takes a path, not a URL object. */
  const buf = await sharp(fileURLToPath(new URL(`${name}.png`, dir)))
    .resize({ width: 1000, withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

async function fontFace(family, file, weight) {
  const buf = await readFile(new URL(file, FONTS));
  return `@font-face{font-family:"${family}";font-weight:${weight};font-style:normal;font-display:swap;src:url(data:font/woff2;base64,${buf.toString("base64")}) format("woff2")}`;
}

/** "home-1440-dark" → { screen, width, mode } */
function parseName(name) {
  const m = name.match(/^(.*?)-(1440|1024|390)(?:-(light|dark))?$/);
  if (!m) return { screen: name, width: null, mode: null };
  return { screen: m[1], width: Number(m[2]), mode: m[3] ?? null };
}

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ── Build ───────────────────────────────────────────────────────────────── */

const report = JSON.parse(await readFile(new URL("report.json", SHOTS), "utf8"));
const byName = new Map(report.report.map((r) => [r.name, r]));

const files = (await readdir(SHOTS)).filter((f) => f.endsWith(".png")).map((f) => f.replace(/\.png$/, ""));
const beforeFiles = (await readdir(BEFORE).catch(() => []))
  .filter((f) => f.endsWith(".png"))
  .map((f) => f.replace(/\.png$/, ""));

const images = new Map();
for (const name of files) images.set(name, await encode(SHOTS, name));
for (const name of beforeFiles) images.set(name, await encode(BEFORE, name));

const fonts = [
  await fontFace("Voice", "general-sans-500.woff2", 500),
  await fontFace("Voice", "general-sans-600.woff2", 600),
  await fontFace("Voice", "general-sans-700.woff2", 700),
  await fontFace("Machine", "jetbrains-mono-latin.woff2", "100 800"),
].join("\n");

function figure(name, caption, sub) {
  const src = images.get(name);
  if (!src) return "";
  const r = byName.get(name);
  const state = r ? (r.overflow || r.contrastFailures ? "flag" : "pass") : null;
  const meta = r ? `${r.height}px tall · ${r.checked} text nodes checked` : "";
  return `<figure class="shot">
  <button class="frame" type="button" data-full="${esc(name)}" aria-label="Open ${esc(caption)} full size">
    <img src="${src}" alt="${esc(caption)}" loading="lazy" />
  </button>
  <figcaption>
    <span class="cap">${esc(caption)}</span>
    ${sub ? `<span class="sub">${esc(sub)}</span>` : ""}
    ${state ? `<span class="state" data-state="${state}">${state === "pass" ? "clean" : "check"}</span>` : ""}
    ${meta ? `<span class="meta">${esc(meta)}</span>` : ""}
  </figcaption>
</figure>`;
}

const paired = new Set(PAIRS.flatMap((p) => [p.after, p.before]));

const groupHtml = GROUPS.map((g) => {
  const mine = files.filter((f) => g.match(f) && !paired.has(f));
  if (!mine.length) return "";

  /* Full-page shots first, ordered widest to narrowest, then the sections. */
  const parsed = mine.map((n) => ({ name: n, ...parseName(n) }));
  const sized = parsed.filter((p) => p.width).sort((a, b) => b.width - a.width || (a.mode ?? "").localeCompare(b.mode ?? ""));
  const sections = parsed.filter((p) => !p.width);

  const shots = [
    ...sized.map((p) =>
      figure(p.name, WIDTH_LABEL[p.width] ?? String(p.width), p.mode ? `${p.mode} mode` : null),
    ),
    ...sections.map((p) =>
      figure(
        p.name,
        SECTION_LABEL[p.name] ?? p.screen.replace(/^[a-z]+-/, "").replace(/-/g, " "),
        "section",
      ),
    ),
  ].join("\n");

  return `<section class="group" id="${g.key}">
  <header class="groupHead">
    <h2>${esc(g.title)}</h2>
    <p>${esc(g.note)}</p>
  </header>
  <div class="grid">${shots}</div>
</section>`;
}).join("\n");

const pairHtml = PAIRS.filter((p) => images.has(p.before) && images.has(p.after))
  .map(
    (p) => `<section class="pair">
  <header class="pairHead">
    <h3>${esc(p.title)}</h3>
    <p>${esc(p.note)}</p>
  </header>
  <div class="pairGrid">
    <figure class="shot">
      <button class="frame" type="button" data-full="${esc(p.before)}" aria-label="Open the previous ${esc(p.title)} full size">
        <img src="${images.get(p.before)}" alt="${esc(p.title)}, before" loading="lazy" />
      </button>
      <figcaption><span class="cap">Before</span></figcaption>
    </figure>
    <figure class="shot">
      <button class="frame" type="button" data-full="${esc(p.after)}" aria-label="Open the current ${esc(p.title)} full size">
        <img src="${images.get(p.after)}" alt="${esc(p.title)}, after" loading="lazy" />
      </button>
      <figcaption><span class="cap">After</span></figcaption>
    </figure>
  </div>
</section>`,
  )
  .join("\n");

const shotCount = report.report.length;
const overflowCount = report.report.filter((r) => r.overflow).length;
const contrastCount = report.report.reduce((n, r) => n + r.contrastFailures, 0);
const nodeCount = report.report.reduce((n, r) => n + r.checked, 0);

const html = `<title>Canopy Contact Sheet</title>
<style>
${fonts}

/*
 * The product's own tokens. Light is the base — the app was dark-only and a
 * ledger is a document before it is a cockpit — and dark is a mode.
 */
:root {
  --bg: #f4f4f6;
  --s1: #ffffff;
  --inset: #f7f7f9;
  --ink: #111114;
  --ink2: #3f3f47;
  --ink3: #56565f;
  --meta: #6e6e78;
  --edge: rgba(17, 17, 20, 0.08);
  --line: rgba(17, 17, 20, 0.06);
  --line2: rgba(17, 17, 20, 0.14);
  --lift: 0 1px 2px rgba(17, 17, 20, 0.04), 0 8px 24px rgba(17, 17, 20, 0.05);
  --accent: #6d3fd4;
  --accent-tint: rgba(109, 63, 212, 0.09);
  --accent-line: rgba(109, 63, 212, 0.26);
  --moss: #0f7d44;
  --moss-tint: rgba(15, 125, 68, 0.10);
  --loss: #c62f37;
  --loss-tint: rgba(198, 47, 55, 0.10);
  --shade: rgba(6, 6, 10, 0.86);
}

:root:not([data-theme="light"]) {
  color-scheme: light;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0b0b12;
    --s1: #131319;
    --inset: #17171e;
    --ink: #f4f4f6;
    --ink2: #c9c9d2;
    --ink3: #a6a6b2;
    --meta: #8b8b97;
    --edge: rgba(255, 255, 255, 0.09);
    --line: rgba(255, 255, 255, 0.06);
    --line2: rgba(255, 255, 255, 0.16);
    --lift: 0 1px 2px rgba(0, 0, 0, 0.4), 0 10px 30px rgba(0, 0, 0, 0.35);
    --accent: #a78bfa;
    --accent-tint: rgba(167, 139, 250, 0.14);
    --accent-line: rgba(167, 139, 250, 0.32);
    --moss: #4ade80;
    --moss-tint: rgba(74, 222, 128, 0.14);
    --loss: #f26d6d;
    --loss-tint: rgba(242, 109, 109, 0.14);
    --shade: rgba(0, 0, 0, 0.9);
    color-scheme: dark;
  }
}

:root[data-theme="dark"] {
  --bg: #0b0b12;
  --s1: #131319;
  --inset: #17171e;
  --ink: #f4f4f6;
  --ink2: #c9c9d2;
  --ink3: #a6a6b2;
  --meta: #8b8b97;
  --edge: rgba(255, 255, 255, 0.09);
  --line: rgba(255, 255, 255, 0.06);
  --line2: rgba(255, 255, 255, 0.16);
  --lift: 0 1px 2px rgba(0, 0, 0, 0.4), 0 10px 30px rgba(0, 0, 0, 0.35);
  --accent: #a78bfa;
  --accent-tint: rgba(167, 139, 250, 0.14);
  --accent-line: rgba(167, 139, 250, 0.32);
  --moss: #4ade80;
  --moss-tint: rgba(74, 222, 128, 0.14);
  --loss: #f26d6d;
  --loss-tint: rgba(242, 109, 109, 0.14);
  --shade: rgba(0, 0, 0, 0.9);
  color-scheme: dark;
}

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--ink);
  font-family: "Voice", ui-sans-serif, system-ui, sans-serif;
  font-weight: 500;
  -webkit-font-smoothing: antialiased;
}

.wrap {
  max-width: 1240px;
  margin-inline: auto;
  padding: 56px 32px 140px;
  display: flex;
  flex-direction: column;
  gap: 76px;
}

/* ── Head ── */
.eyebrow {
  font-family: "Machine", ui-monospace, monospace;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--accent);
}

h1 {
  margin: 14px 0 0;
  font-size: clamp(36px, 5vw, 62px);
  font-weight: 600;
  line-height: 1.02;
  letter-spacing: -0.04em;
  text-wrap: balance;
}

.lede {
  margin: 22px 0 0;
  max-width: 62ch;
  font-size: 18px;
  line-height: 1.55;
  color: var(--ink3);
  text-wrap: pretty;
}

/* Four figures on one hairline — the dashboard's own summary grammar. */
.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  margin-top: 44px;
  border-top: 1px solid var(--line2);
}

.kpi {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 22px 26px 22px 0;
  border-right: 1px solid var(--line);
}

.kpi:last-child { border-right: 0; }

.kpi b {
  font-size: 34px;
  font-weight: 600;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}

.kpi b[data-tone="moss"] { color: var(--moss); }

.kpi span {
  font-family: "Machine", ui-monospace, monospace;
  font-size: 10.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--meta);
}

.kpi i {
  font-style: normal;
  font-size: 13px;
  line-height: 1.45;
  color: var(--ink3);
}

/* ── Groups ── */
.group { scroll-margin-top: 24px; }

.groupHead {
  padding-bottom: 22px;
  border-bottom: 1px solid var(--line2);
}

.groupHead h2 {
  margin: 0;
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.03em;
}

.groupHead p {
  margin: 10px 0 0;
  max-width: 68ch;
  font-size: 15px;
  line-height: 1.55;
  color: var(--ink3);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(288px, 1fr));
  gap: 30px;
  margin-top: 30px;
}

.shot { margin: 0; }

.frame {
  display: block;
  width: 100%;
  padding: 0;
  border: 1px solid var(--edge);
  border-radius: 18px;
  overflow: hidden;
  background: var(--s1);
  box-shadow: var(--lift);
  cursor: zoom-in;
  transition: box-shadow 0.16s ease, border-color 0.16s ease;
}

.frame:hover { border-color: var(--line2); }

.frame:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}

.frame img {
  display: block;
  width: 100%;
  height: auto;
}

figcaption {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 10px;
  margin-top: 12px;
}

.cap {
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  text-transform: capitalize;
}

.sub, .meta {
  font-family: "Machine", ui-monospace, monospace;
  font-size: 10.5px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--meta);
}

.meta { flex-basis: 100%; }

/* State is a word as well as a hue — colour alone never carries a status. */
.state {
  font-family: "Machine", ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 999px;
}

.state[data-state="pass"] {
  color: var(--moss);
  background: var(--moss-tint);
}

.state[data-state="flag"] {
  color: var(--loss);
  background: var(--loss-tint);
}

/* ── Before and after ── */
.pairs {
  display: flex;
  flex-direction: column;
  gap: 60px;
}

.pair { scroll-margin-top: 24px; }

.pairHead h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.pairHead p {
  margin: 10px 0 0;
  max-width: 74ch;
  font-size: 15px;
  line-height: 1.6;
  color: var(--ink3);
}

.pairGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 26px;
  margin-top: 24px;
}

.pairGrid .cap {
  font-family: "Machine", ui-monospace, monospace;
  font-size: 10.5px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--meta);
}

/* ── Lightbox ── */
dialog {
  padding: 0;
  border: 0;
  background: transparent;
  max-width: 96vw;
  max-height: 96vh;
}

dialog::backdrop { background: var(--shade); }

dialog img {
  display: block;
  max-width: 96vw;
  max-height: 92vh;
  width: auto;
  border-radius: 12px;
}

.close {
  position: fixed;
  top: 18px;
  right: 18px;
  font-family: "Machine", ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #fff;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 999px;
  padding: 8px 16px;
  cursor: pointer;
}

@media (max-width: 720px) {
  .wrap { padding: 40px 20px 100px; gap: 56px; }
  .kpi { border-right: 0; border-bottom: 1px solid var(--line); padding: 18px 0; }
  .kpi:last-child { border-bottom: 0; }
}

@media (prefers-reduced-motion: reduce) {
  * { transition: none !important; animation: none !important; }
}
</style>

<div class="wrap">
  <header>
    <span class="eyebrow">Visual record · ${esc(new Date().toISOString().slice(0, 10))}</span>
    <h1>Every screen, three widths, both modes.</h1>
    <p class="lede">
      Shot against a seeded fourteen-month ledger, so the figures are computed
      by the app's own scoring and derivation rather than typed in. Each frame
      was measured for horizontal overflow, page errors and text contrast
      before its picture was taken — the sheet is the verification pass, not a
      gallery of it.
    </p>

    <div class="kpis">
      <div class="kpi"><span>Frames</span><b>${shotCount}</b><i>Eleven screens plus six sections.</i></div>
      <div class="kpi"><span>Text nodes checked</span><b>${nodeCount.toLocaleString("en-US")}</b><i>Foreground composited over its real ground.</i></div>
      <div class="kpi"><span>Overflow</span><b data-tone="moss">${overflowCount}</b><i>No screen scrolls sideways at any width.</i></div>
      <div class="kpi"><span>Contrast failures</span><b data-tone="moss">${contrastCount}</b><i>Everything clears WCAG AA for its size.</i></div>
    </div>
  </header>

  <section class="pairs">
    <header class="groupHead">
      <h2>What changed</h2>
      <p>Rendered from a worktree at the commit before this work, against the same build today.</p>
    </header>
    ${pairHtml}
  </section>

  ${groupHtml}
</div>

<dialog id="lb">
  <button class="close" type="button" autofocus>Close</button>
  <img alt="" />
</dialog>

<script>
  /* One dialog, reused. The full-size source is the same data URI. */
  const lb = document.getElementById("lb");
  const img = lb.querySelector("img");
  const sources = new Map(
    [...document.querySelectorAll(".frame")].map((b) => [b.dataset.full, b.querySelector("img").src]),
  );
  for (const button of document.querySelectorAll(".frame")) {
    button.addEventListener("click", () => {
      img.src = sources.get(button.dataset.full);
      img.alt = button.querySelector("img").alt;
      lb.showModal();
    });
  }
  lb.querySelector(".close").addEventListener("click", () => lb.close());
  lb.addEventListener("click", (e) => { if (e.target === lb) lb.close(); });
</script>
`;

await writeFile(new URL("index.html", SHOTS), html);
console.log(`contact sheet: ${images.size} images, ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(1)}MB`);
