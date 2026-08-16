#!/usr/bin/env node
/**
 * The Wrapped pipeline, end to end, against a fixture.
 *
 *   npm run wrapped:check              # validate + render, no key needed
 *   npm run wrapped:check -- --render  # also write the twelve PNGs
 *   npm run wrapped:check -- --batch=20
 *
 * This is the acceptance harness rather than a demo. It runs the same code the
 * product runs, then asserts the things the pipeline promises: no token
 * survives, every value on a card equals the stats character for character,
 * the markup is untouched outside the caption, no dollar figure appears while
 * the privacy toggle is off, and no caption scolds, advises or predicts.
 *
 * It runs without `OPENAI_API_KEY`, and that is the point: with no key every
 * card takes the deterministic path, which is exactly the path a model failure
 * lands on. If the fallback is broken, this says so without spending anything.
 * With a key set, the captions come from the model and go through the same
 * gate.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { CARDS } from "../wrapped/cards.mjs";
import {
  captionIsClean,
  captionOf,
  fill,
  fitHero,
  tokenValues,
  validate,
} from "../lib/wrapped/personalise.ts";
import { finishCard } from "../lib/wrapped/run.ts";
import { earnedCards } from "../lib/wrapped/stats.ts";

const OUT = new URL("../.wrapped-check/", import.meta.url);
const render = process.argv.includes("--render");
const batch = Number(process.argv.find((a) => a.startsWith("--batch="))?.slice(8) || 1);

/**
 * A fixture reader. Deterministic, and shaped like a real one: every token
 * present, every figure already formatted the way `stats.ts` formats it.
 */
function fixture(i = 0) {
  const spin = (n) => ((i * 37 + n) % 90) + 5;
  return {
    USER_NAME: ["Deacon", "Rae", "Sam", "Ori", "Wren"][i % 5],
    YEAR: "2026",
    TOTAL_RETURN_PCT: `${i % 3 === 0 ? "−" : "+"}${(spin(1) / 4).toFixed(1)}%`,
    CONTRIBUTION_COUNT: String(spin(2)),
    CONTRIBUTION_STREAK_WEEKS: String(spin(3) % 40),
    LONGEST_HOLD_TICKER: ["COST", "NVDA", "ASML", "VOO", "BRK.B"][i % 5],
    LONGEST_HOLD_DAYS: String(120 + spin(4)),
    BEST_TICKER: ["NVDA", "AAPL", "MSFT", "TSLA", "AMD"][i % 5],
    BEST_RETURN_PCT: `+${(spin(5) / 2).toFixed(1)}%`,
    MAX_DRAWDOWN_PCT: `−${(spin(6) / 5).toFixed(1)}%`,
    RECOVERY_DAYS: String(spin(7) % 60),
    BUSIEST_MONTH: ["March", "July", "October", "January", "May"][i % 5],
    TRADE_COUNT_YEAR: String(40 + spin(8)),
    RED_DAY_BUYS: String(spin(9) % 30),
    TOP_SECTOR: ["Technology", "Consumer Staples", "Semiconductors", "Energy", "Health Care"][i % 5],
    TOP_SECTOR_PCT: `${20 + (spin(10) % 60)}%`,
    HOLDINGS_COUNT: String(4 + (spin(11) % 20)),
    VS_SPY_PCT: `${i % 2 === 0 ? "+" : "−"}${(spin(12) / 8).toFixed(1)}%`,
    ARCHETYPE_NAME: ["The Steward", "The Sentinel", "The Improviser", "The Builder", "The Patient"][i % 5],
    ARCHETYPE_TRAIT: "A written plan, run slowly and on schedule.",
    INVESTOR_AGE: String(24 + (spin(13) % 40)),
  };
}

const templateFor = async (no) =>
  readFile(fileURLToPath(new URL(`../wrapped/templates/card-${no}.html`, import.meta.url)), "utf8");

/** Anything that looks like money, for the percent-first privacy rule. */
const DOLLARS = /\$\s?[\d,]/;

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error(`  ✗ ${msg}`);
};

/* ── 1 · Every template renders with its placeholders visible ───────────── */
console.log("templates");
for (const card of CARDS) {
  const html = await templateFor(card.no);
  const declared = [...html.matchAll(/data-token="([A-Z_]+)"/g)].map((m) => m[1]);
  const wanted = new Set([...card.tokens, "YEAR"]);
  const missing = [...wanted].filter((t) => !declared.includes(t));
  const stray = declared.filter((t) => !wanted.has(t));
  if (missing.length) fail(`card-${card.no}: template is missing ${missing.join(", ")}`);
  if (stray.length) fail(`card-${card.no}: template carries unexpected ${stray.join(", ")}`);
  if (!html.includes("{{CAPTION}}")) fail(`card-${card.no}: no caption slot`);
  if (!/width:1080px;height:1920px/.test(html)) fail(`card-${card.no}: not a 1080x1920 stage`);
}
console.log(`  ${CARDS.length} templates, ${failures ? failures + " problems" : "all well-formed"}`);

/* ── 2 · A batch of readers through the real pipeline ───────────────────── */
console.log(`\npersonalising ${batch} reader${batch === 1 ? "" : "s"}`);
let fromModel = 0;
let fromFallback = 0;
let finishedForRender = [];

for (let i = 0; i < batch; i += 1) {
  const stats = fixture(i);
  const earned = earnedCards(CARDS, stats);
  if (earned.length !== CARDS.length) {
    fail(`reader ${i}: fixture should earn all ${CARDS.length}, earned ${earned.length}`);
  }

  const finished = [];
  for (const card of earned) {
    const template = await templateFor(card.no);
    const out = await finishCard(
      { no: card.no, key: card.key, template, fallbackCaptions: card.fallbackCaptions },
      stats,
      { aheadOfIndex: !stats.VS_SPY_PCT.startsWith("−"), showDollars: false },
      card.tokens,
      `fixture-${i}`,
    );
    finished.push(out);
    out.source === "model" ? (fromModel += 1) : (fromFallback += 1);

    /* Check 1, 2 and 3 — the same gate the runtime uses. */
    const verdict = validate(out.html, template, stats);
    if (!verdict.ok) fail(`reader ${i} card ${card.no}: ${verdict.check} — ${verdict.detail}`);

    /* Every data-token element equals the stats, character for character. */
    for (const { token, text } of tokenValues(out.html)) {
      if (text !== stats[token]) {
        fail(`reader ${i} card ${card.no}: ${token} is ${JSON.stringify(text)}`);
      }
    }

    /* Percent-first: no dollar figure while the toggle is off. */
    const body = out.html.replace(/<!--[\s\S]*?-->/g, "");
    if (DOLLARS.test(body)) fail(`reader ${i} card ${card.no}: a dollar figure with dollars off`);

    /* Tone. */
    const caption = captionOf(out.html) ?? "";
    const clean = captionIsClean(caption);
    if (!clean.ok) fail(`reader ${i} card ${card.no}: caption — ${clean.reason}: ${caption}`);
  }
  if (i === 0) finishedForRender = finished;
}

console.log(`  ${fromModel} captions from the model, ${fromFallback} from the bank`);

/* ── 3 · Forced failure: a corrupt answer must not reach a reader ───────── */
console.log("\nforced failure");
{
  const stats = fixture(0);
  const card = CARDS.find((c) => c.no === "05");
  const template = await templateFor(card.no);
  const good = fill(template, stats, "Your strongest name of the year.");

  const corruptions = {
    "a reformatted number": good.replace(stats.BEST_RETURN_PCT, "+43 %"),
    "an invented ticker": good.replace(stats.BEST_TICKER, "GME"),
    "a leftover token": good.replace(stats.BEST_RETURN_PCT, "{{BEST_RETURN_PCT}}"),
    "an added element": good.replace("</div>", "<p>Nice work</p></div>"),
    "a deleted element": good.replace(/<span class="factValue"[\s\S]*?<\/span>/, ""),
  };

  for (const [name, bad] of Object.entries(corruptions)) {
    const verdict = validate(bad, template, stats);
    if (verdict.ok) fail(`${name} passed validation — the gate is open`);
    else console.log(`  ✓ ${name} rejected (${verdict.check})`);
  }

  /* And the card the reader gets instead is correct. */
  const fallback = fill(template, stats, card.fallbackCaptions[0]);
  const verdict = validate(fallback, template, stats);
  if (!verdict.ok) fail("the deterministic fallback does not validate");
  else console.log("  ✓ the fallback card renders and validates");
}

/* ── 4 · Render, at the size a story actually is ────────────────────────── */
if (render) {
  console.log("\nrendering");
  const { chromium } = await import("playwright-core");
  /*
   * The stylesheet is inlined, and so is everything it imports.
   *
   * Stripping the `@import` and calling it done rendered black type on a black
   * card in a serif fallback — every `var(--share-*)` resolved to nothing and
   * every face fell through. A render that proves the card is fine because it
   * could not draw it is worse than no render, so the tokens and the two faces
   * the card actually uses are embedded here.
   */
  const rawCss = await readFile(
    fileURLToPath(new URL("../wrapped/templates/card.css", import.meta.url)),
    "utf8",
  );
  const tokens = await readFile(
    fileURLToPath(new URL("../styles/tokens.css", import.meta.url)),
    "utf8",
  );
  /*
   * Every `/fonts/*` the stylesheet asks for, not a named three. The named
   * list missed `general-sans-500` — which is what the caption sets in, since
   * the body asks for 400 and 500 is the nearest declared weight — and a face
   * that silently falls through is exactly the failure this render exists to
   * catch.
   */
  const faces = [...rawCss.matchAll(/url\("\/fonts\/([^"]+)"\)/g)].map((m) => m[1]);
  const embedded = new Map(
    await Promise.all(
      faces.map(async (file) => {
        const bytes = await readFile(
          fileURLToPath(new URL(`../public/fonts/${file}`, import.meta.url)),
        );
        return [file, bytes.toString("base64")];
      }),
    ),
  );
  const css =
    tokens +
    rawCss
      .replace(/@import[^;]+;/, "")
      .replace(
        /url\("\/fonts\/([^"]+)"\)/g,
        (_, file) => `url(data:font/woff2;base64,${embedded.get(file)})`,
      );
  await mkdir(fileURLToPath(OUT), { recursive: true });

  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });

  for (const card of finishedForRender) {
    /*
     * The stylesheet is inlined and the background is inlined as a data URI,
     * so the page has no origin to resolve against and Playwright can render
     * it from a string. A card is a self-contained stage; this is where that
     * pays off.
     */
    const bg = await readFile(
      fileURLToPath(new URL(`../public/wrapped/2026/backgrounds/bg-${card.no}.webp`, import.meta.url)),
    ).catch(() => null);

    /* The fit is a render-time pass, so it happens here — same as in the app. */
    let html = fitHero(card.html).replace(
      '<link rel="stylesheet" href="card.css">',
      `<style>${css}</style>`,
    );
    if (bg) {
      html = html.replace(
        /<picture>[\s\S]*?<\/picture>/,
        `<img class="bg" src="data:image/webp;base64,${bg.toString("base64")}" alt="">`,
      );
    }

    await page.setContent(html, { waitUntil: "load" });

    /*
     * The card set in the browser's default serif for a while and every check
     * above still passed, because none of them look at the drawing — the type
     * was correct, correctly gated, and correctly wrong on screen. The cause
     * was `font-family: "Machine", var(--font-mono), monospace`: an
     * unresolved `var()` does not fall through to the next name, it
     * invalidates the whole declaration, and the element inherits instead.
     *
     * So the probe asks the page two things. That the rule survived — the
     * computed family still begins with the card's own name rather than
     * whatever it inherited — and that the face behind that name actually
     * loaded. Either one alone would have missed it.
     */
    const type = await page.evaluate(() => {
      const first = (el) =>
        el ? getComputedStyle(el).fontFamily.split(",")[0].replace(/["']/g, "").trim() : null;
      const hero = document.querySelector(".hero");
      return {
        card: first(document.querySelector(".card")),
        hero: first(hero),
        /* The hero's own attribute — `.factValue` wears this too. */
        heroKind: hero?.getAttribute("data-kind") ?? null,
        eyebrow: first(document.querySelector(".eyebrow")),
        voice: document.fonts.check('600 58px Voice'),
        machine: document.fonts.check('700 380px Machine'),
      };
    });
    const wantHero = type.heroKind === "word" ? "Voice" : "Machine";
    if (type.card !== "Voice") fail(`card-${card.no}: body sets in ${type.card}, not Voice`);
    if (type.hero !== wantHero) fail(`card-${card.no}: hero sets in ${type.hero}, not ${wantHero}`);
    if (type.eyebrow !== "Machine") fail(`card-${card.no}: eyebrow sets in ${type.eyebrow}`);
    if (!type.voice) fail(`card-${card.no}: the Voice face never loaded`);
    if (!type.machine) fail(`card-${card.no}: the Machine face never loaded`);

    await page.screenshot({
      path: fileURLToPath(new URL(`card-${card.no}.png`, OUT)),
      clip: { x: 0, y: 0, width: 1080, height: 1920 },
    });
    console.log(`  card-${card.no}.png`);
  }
  await browser.close();
}

console.log(
  failures
    ? `\n${failures} problem${failures === 1 ? "" : "s"}`
    : "\nall checks passed",
);
process.exit(failures ? 1 : 0);
