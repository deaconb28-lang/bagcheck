#!/usr/bin/env node
/**
 * The dashboard's grounds. Generated once, for everybody.
 *
 *   OPENAI_API_KEY=… npm run dash:art
 *   OPENAI_API_KEY=… npm run dash:art -- --print     # prompts only, spends nothing
 *
 * A Wrapped card is a poster: the art is the subject and the type sits on it at
 * full strength. A dashboard panel is the opposite — the *figures* are the
 * subject, and anything behind them is a ground or it is a problem. So these
 * are drawn to a different brief from `generate-backgrounds.mjs` and used at a
 * fraction of its strength: the panel's own fill still carries the contrast,
 * and the art only has to make the plate feel like a place rather than a
 * rectangle.
 *
 * Every brief therefore asks for the incident at the **edges** and a quiet
 * middle, the same negative-of-the-lockup logic the cards use, and for a dark
 * near-monochrome image — a saturated ground under a green figure would fight
 * the one thing on the panel that has to be read.
 *
 * Idempotent: a file that exists is skipped. `--force` redraws.
 */

import { mkdir, writeFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const OUT = new URL("../public/dash/", import.meta.url);
const REQUEST_SIZE = "1536x1024";
/* Panels are wide and short. The art is a ground, so it crops rather than fits. */
const W = 1440;
const H = 720;

const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const USD_PER_IMAGE = Number(process.env.OPENAI_IMAGE_USD || 0.25);

/**
 * What every ground must be, stated once.
 *
 * The prohibitions are the load-bearing half and they are stricter than the
 * cards': a card can afford a bright incident because nothing is read over it,
 * and a panel cannot. "Near-black" and "no bright areas" are the two clauses
 * that keep a figure legible.
 */
const GROUND =
  "Extremely dark near-black atmospheric image, almost monochrome, very low " +
  "contrast, no bright areas anywhere. Keep the whole centre empty and " +
  "featureless; put what little incident there is along the outer edges and " +
  "corners. Wide 3:2 landscape. Absolutely no text, letters, numbers or " +
  "symbols. No charts, graphs, arrows or financial iconography. No logos, no " +
  "people, no faces, no hands, no aircraft, no vehicles.";

/**
 * One ground per band of the page, and they differ by *material* rather than
 * by subject — the same reason the twelve card media differ. Six grounds that
 * were all "a dark sky" would be one ground used six times.
 */
export const GROUNDS = {
  read: {
    subject:
      "the faint curve of a planet's limb across the very bottom edge, with a " +
      "thin band of atmosphere glowing above it",
    material: "smooth volumetric gradient, no grain, no visible edges",
  },
  race: {
    subject:
      "long parallel light trails receding toward the right edge, faint, like " +
      "a long exposure",
    material: "long-exposure photograph, soft motion smear, fine sensor grain",
  },
  charts: {
    subject: "thin high-altitude cirrus catching raking light along the top edge",
    material: "near-monochrome photograph, soft focus, gentle film grain",
  },
  grid: {
    subject: "a sparse star field with one faint nebula wash in a far corner",
    material: "deep-sky astrophotograph, fine noise, no bloom",
  },
  findings: {
    subject:
      "faint drafting linework and construction arcs drifting in from the left " +
      "and right edges",
    material: "technical blueprint on near-black coated paper, chalk-thin lines",
  },
  set: {
    subject: "a dark iridescent sheen catching light only at the extreme corners",
    material: "holographic foil photographed at a raking angle, matte overall",
  },
};

export function promptFor(name) {
  const g = GROUNDS[name];
  return `${g.material}. Subject: ${g.subject}. ${GROUND}`;
}

const names = Object.keys(GROUNDS);
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7)?.split(",");
const force = process.argv.includes("--force");

if (process.argv.includes("--print")) {
  for (const name of names) {
    if (only && !only.includes(name)) continue;
    console.log(`\n── ${name}\n${promptFor(name)}`);
  }
  process.exit(0);
}

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set — nothing to generate with.");
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

async function draw(name) {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      prompt: promptFor(name),
      size: REQUEST_SIZE,
      quality: "high",
      n: 1,
    }),
  });

  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);
  const b64 = (await res.json())?.data?.[0]?.b64_json;
  if (!b64) throw new Error("response carried no image data");

  /*
   * WebP only, and that is the difference from the card set. A card keeps a
   * PNG because its `<picture>` declares one as the fallback; a CSS
   * `background-image` has no fallback element to declare, and every browser
   * this app supports reads WebP. A 3MB PNG that nothing will ever request is
   * three megabytes in the deploy image.
   */
  return sharp(Buffer.from(b64, "base64"))
    .resize(W, H, { fit: "cover" })
    .webp({ quality: 78, effort: 6 })
    .toBuffer();
}

await mkdir(fileURLToPath(OUT), { recursive: true });

let drawn = 0;
let skipped = 0;
const failures = [];

for (const name of names) {
  if (only && !only.includes(name)) continue;

  const file = new URL(`${name}.webp`, OUT);
  if (!force && (await exists(file))) {
    console.log(`${name.padEnd(10)} skipped — already drawn`);
    skipped += 1;
    continue;
  }

  try {
    const webp = await draw(name);
    await writeFile(fileURLToPath(file), webp);
    drawn += 1;
    console.log(`${name.padEnd(10)} ${(webp.length / 1024).toFixed(0)}KB  ~$${USD_PER_IMAGE.toFixed(2)}`);
  } catch (err) {
    failures.push(`${name}: ${err.message}`);
    console.error(`${name.padEnd(10)} FAILED — ${err.message}`);
  }
}

console.log(
  `\n${drawn} drawn, ${skipped} skipped, ${failures.length} failed` +
    `  ·  ~$${(drawn * USD_PER_IMAGE).toFixed(2)} this run`,
);
