#!/usr/bin/env node
/**
 * The twelve Wrapped backgrounds. Generated once, for everybody.
 *
 *   OPENAI_API_KEY=… npm run wrapped:backgrounds
 *   OPENAI_API_KEY=… npm run wrapped:backgrounds -- --print   # prompts only
 *
 * Not per user. A background is the stage a card is set on, and every
 * user-specific thing on a Canopy card lives in the HTML text layer above
 * it — so generating art per reader would be slow, expensive, and would buy
 * nothing a shared image does not already give. Twelve images, committed, and
 * the cost is paid once.
 *
 * Idempotent by design: a file that exists is skipped. Re-running is how you
 * fill a gap after a failed image, not how you get a new set — and a new set
 * is a deliberate act, because these ship under artefacts people have already
 * posted. Delete the file you want redrawn.
 *
 * The prompt forbids text, and that is the load-bearing clause. Image models
 * garble letterforms; every figure on a card is a number that came off a
 * brokerage, and a garbled one is a number nobody can correct on an artefact
 * whose whole claim is that its numbers are real.
 */

import { mkdir, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { backgroundCards, drawBackground, promptFor } from "../lib/wrapped/backgrounds.ts";

const OUT = new URL("../public/wrapped/2026/art/stratosphere-01/", import.meta.url);

/*
 * Published list price for gpt-image-1 at high quality, portrait. Logged per
 * image so a run states what it cost rather than leaving it to a dashboard a
 * week later. Override when the price moves — it is a note, not a charge.
 */
const USD_PER_IMAGE = Number(process.env.OPENAI_IMAGE_USD || 0.25);

const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7)?.split(",");
const force = process.argv.includes("--force");
const print = process.argv.includes("--print");

/*
 * `--print` spends nothing. Twelve high-quality portraits is real money, and
 * the prompt is the whole artefact — being able to read what is about to be
 * drawn before paying for it is worth the six lines.
 */
if (print) {
  for (const card of backgroundCards()) {
    if (only && !only.includes(card.no) && !only.includes(card.key)) continue;
    console.log(`\n── ${card.no}  ${card.key}\n${promptFor(card)}`);
  }
  process.exit(0);
}

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set — nothing to generate with.");
  console.error("The twelve PNGs are committed; you only need a key to redraw one.");
  process.exit(1);
}

async function exists(url) {
  try {
    await access(fileURLToPath(url));
    return true;
  } catch {
    return false;
  }
}

/*
 * The drawing itself lives in `lib/wrapped/backgrounds.ts`, and this script
 * calls it rather than repeating it.
 *
 * It used to repeat it, and that is exactly the drift that file's own note
 * warned about: the deck moved from one shared `STYLE_PREFIX` to a per-card
 * medium, texture and palette, the route followed, and this script did not —
 * it went on importing an export that no longer exists. **`npm run
 * wrapped:backgrounds` has been failing at import for as long as that has been
 * true**, which is the real reason no art set was ever drawn. One prompt, one
 * place, and a caller that cannot silently disagree with it.
 */

await mkdir(fileURLToPath(OUT), { recursive: true });

let drawn = 0;
let skipped = 0;
const failures = [];

for (const card of backgroundCards()) {
  if (only && !only.includes(card.no) && !only.includes(card.key)) continue;

  const file = new URL(`bg-${card.no}.png`, OUT);
  if (!force && (await exists(file))) {
    console.log(`bg-${card.no}  ${card.key.padEnd(14)} skipped — already drawn`);
    skipped += 1;
    continue;
  }

  try {
    const png = await drawBackground(card);
    await writeFile(fileURLToPath(file), png);
    drawn += 1;
    console.log(
      `bg-${card.no}  ${card.key.padEnd(14)} ${(png.length / 1024).toFixed(0)}KB` +
        `  ~$${USD_PER_IMAGE.toFixed(2)}`,
    );
  } catch (err) {
    failures.push(`${card.no} ${card.key}: ${err.message}`);
    console.error(`bg-${card.no}  ${card.key.padEnd(14)} FAILED — ${err.message}`);
  }
}

console.log(
  `\n${drawn} drawn, ${skipped} skipped, ${failures.length} failed` +
    `  ·  ~$${(drawn * USD_PER_IMAGE).toFixed(2)} this run`,
);

/*
 * A partial set is a broken deck, so the exit code says so. Re-running picks
 * up exactly the ones that are missing.
 */
if (failures.length) process.exit(1);
