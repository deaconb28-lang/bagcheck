#!/usr/bin/env node
/**
 * The twelve Wrapped backgrounds. Generated once, for everybody.
 *
 *   OPENAI_API_KEY=… npm run wrapped:backgrounds
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
import sharp from "sharp";
import { CARDS, STYLE_PREFIX } from "../wrapped/cards.mjs";

const OUT = new URL("../public/wrapped/2026/art/stratosphere-01/", import.meta.url);

/* The story frame. 1024×1536 is what the API renders; 1080×1920 is the card. */
const REQUEST_SIZE = "1024x1536";
const W = 1080;
const H = 1920;

const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

/*
 * Published list price for gpt-image-1 at high quality, portrait. Logged per
 * image so a run states what it cost rather than leaving it to a dashboard a
 * week later. Override when the price moves — it is a note, not a charge.
 */
const USD_PER_IMAGE = Number(process.env.OPENAI_IMAGE_USD || 0.25);

const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7)?.split(",");
const force = process.argv.includes("--force");

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

/** One image, with the shared prefix in front of this card's motif. */
async function draw(card) {
  const prompt = `${STYLE_PREFIX} ${card.motif}.`;

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      size: REQUEST_SIZE,
      quality: "high",
      n: 1,
    }),
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
  }

  const b64 = (await res.json()).data?.[0]?.b64_json;
  if (!b64) throw new Error("response carried no image data");

  /*
   * Cover, not stretch. The API's portrait ratio is 2:3 and the card is 9:16,
   * so something has to give — and a gradient that has been squashed reads as
   * a mistake in a way a gradient that has been cropped does not.
   */
  return sharp(Buffer.from(b64, "base64")).resize(W, H, { fit: "cover" }).png().toBuffer();
}

await mkdir(fileURLToPath(OUT), { recursive: true });

let drawn = 0;
let skipped = 0;
const failures = [];

for (const card of CARDS) {
  if (only && !only.includes(card.no) && !only.includes(card.key)) continue;

  const file = new URL(`bg-${card.no}.png`, OUT);
  if (!force && (await exists(file))) {
    console.log(`bg-${card.no}  ${card.key.padEnd(14)} skipped — already drawn`);
    skipped += 1;
    continue;
  }

  try {
    const png = await draw(card);
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
