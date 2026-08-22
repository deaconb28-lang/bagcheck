#!/usr/bin/env node
/**
 * Renders the two emails and photographs them.
 *
 * An email is the one surface in this product nobody can see from inside it:
 * it is built by `lib/email/content.ts`, rendered by `render.ts`, and then
 * handed to a provider — so the only way to review a change to it is to look
 * at the thing itself. `npm run email:shots` writes both to `.shots-email/`.
 *
 * The figures here are a **fixture**, not a reader: they exist so the layout
 * can be judged with realistic strings in it — a four-digit score would size
 * differently from a two-digit one. Nothing in this file reads a ledger and
 * nothing it produces is ever sent.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

import { dailyBrief, weeklyRecap } from "../lib/email/content.ts";
import { renderHtml } from "../lib/email/render.ts";
import { SEND_CADENCE } from "../lib/email/schedule.ts";

/* The browser Railway's image ships, the same one `scripts/shots.mjs` uses. */
const CHROME = "/opt/pw-browsers/chromium";
const OUT = ".shots-email";
mkdirSync(OUT, { recursive: true });

const UNSUB = "https://supercruise.app/profile";

const CASES = [
  {
    key: "monday-brief",
    title: `${SEND_CADENCE.brief} brief`,
    content: dailyBrief({
      date: "2026-08-24",
      score: 74,
      previousScore: 71,
      previousDate: "2026-08-21",
      archetype: "The Steward",
      sentence: "Trade count above your baseline. Your score moved down 2.",
      tail: "That accounts for 4 of today's reading.",
      untagged: 6,
      streak: 12,
    }),
  },
  {
    key: "friday-recap",
    title: `${SEND_CADENCE.recap} recap`,
    content: weeklyRecap({
      weekOf: "2026-08-17",
      scoredDays: 5,
      score: 74,
      weekDelta: 3,
      realised: 1284,
      greenSessions: 3,
      redSessions: 2,
      longestHoldDays: 61,
      archetype: "The Steward",
    }),
  },
];

const browser = await chromium.launch({ executablePath: CHROME });

/*
 * Both widths, every time. Most mail is read on a phone, and the one thing a
 * `<style>` media query cannot be trusted to do is survive every client — so
 * the narrow render is the one that has to be checked by eye.
 */
const WIDTHS = [
  ["desktop", 760],
  ["phone", 390],
];

for (const [label, width] of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 1200 }, deviceScaleFactor: 2 });
  for (const c of CASES) {
    const html = renderHtml(c.content, UNSUB);
    const file = `${OUT}/${c.key}.html`;
    writeFileSync(file, html);
    await page.goto(`file://${process.cwd()}/${file}`);
    await page.screenshot({ path: `${OUT}/${c.key}-${label}.png`, fullPage: true });
  }
  await page.close();
  console.log(`${label.padEnd(9)} ${width}px`);
}

await browser.close();
console.log(`\n${CASES.length} emails in ${OUT}/`);
