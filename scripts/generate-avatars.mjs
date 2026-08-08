#!/usr/bin/env node
/**
 * Generate the sixteen archetype avatars into `public/archetypes/`.
 *
 *   OPENAI_API_KEY=… npm run avatars
 *   npm run avatars -- sentinel keel   # just these
 *   npm run avatars -- --force         # redraw what exists
 *
 * It imports the archetype table and the prompt from TypeScript rather than
 * restating them, so `--import tsx` is not optional — that is what the npm
 * script supplies.
 *
 * **Static files, not a database.** These are sixteen fixed product assets
 * that never change and belong to no user, so they are committed, served from
 * the CDN, and reviewable in a diff. Nothing generates at request time, no
 * visitor pays the latency, and a deployment without an OpenAI key renders
 * exactly the same set.
 *
 * The prompt for each comes from `lib/avatars/prompt.ts`, which reads the
 * emblem from the archetype table — so the sixteen are distinct by
 * construction rather than by whatever the model happened to draw twice.
 *
 * Sequential on purpose. Sixteen images is not worth a concurrency bug
 * against an image endpoint's rate limit.
 *
 * The model returns 1024px files of about 1.7MB each. They are written at
 * 256px, which is 3.5× the largest size an avatar is ever rendered at and
 * turns 28MB of committed binary into well under one — a repo is not a CDN
 * origin for art nobody will look at full-size.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ARCHETYPES } from "../lib/archetypes.ts";
import { avatarPrompt } from "../lib/avatars/prompt.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const OUT = join(ROOT, "public", "archetypes");
const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";

/** 3.5× the 72px the avatar renders at largest. Retina has headroom. */
const SIZE = 256;

/**
 * How much of the generated frame to keep, centred.
 *
 * The prompt asks for a generous margin so the model composes a centred mark
 * rather than a full-bleed texture. That margin is right for the generation
 * and wrong for the render: at 44px inside a rounded tile, an avatar with a
 * quarter of its frame empty reads as a faint speck. Keeping the middle 76%
 * is what makes sixteen independently-generated marks sit at the same
 * optical size.
 */
const KEEP = 0.76;

/**
 * Crop to the centred form and write at SIZE.
 *
 * A plain centre crop, and deliberately not a trim-and-repad. Trimming finds
 * the edge of the glow and pads back with a fixed colour, which never matches
 * the model's own near-black exactly — every avatar came out with a visible
 * rectangle seam around the form. Cropping takes only pixels the model drew,
 * so there is no seam to match.
 *
 * The prompt already asks for the form to occupy the middle two thirds, so
 * this is reading the composition it was given rather than searching for one.
 */
async function frame(input) {
  const { width, height } = await sharp(input).metadata();
  const side = Math.round(Math.min(width, height) * KEEP);
  return sharp(input)
    .extract({
      left: Math.round((width - side) / 2),
      top: Math.round((height - side) / 2),
      width: side,
      height: side,
    })
    .resize(SIZE, SIZE, { fit: "cover" })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
}


if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set — nothing to generate with.");
  process.exit(1);
}

const force = process.argv.includes("--force");
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const targets = ARCHETYPES.filter((a) => !only.length || only.includes(a.key));

mkdirSync(OUT, { recursive: true });

let made = 0;
let skipped = 0;

for (const archetype of targets) {
  const path = join(OUT, `${archetype.key}.png`);
  if (!force && existsSync(path)) {
    console.log(`· ${archetype.key.padEnd(12)} already drawn`);
    skipped += 1;
    continue;
  }

  const started = Date.now();
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        prompt: avatarPrompt(archetype),
        size: "1024x1024",
        quality: "medium",
        output_format: "png",
        n: 1,
      }),
    });

    if (!res.ok) {
      throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
    }
    const json = await res.json();
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("response carried no image data");

    const png = await frame(Buffer.from(b64, "base64"));
    writeFileSync(path, png);
    made += 1;
    console.log(
      `✓ ${archetype.key.padEnd(12)} ${archetype.name.padEnd(16)} ${(png.length / 1024).toFixed(0)}kB  ${((Date.now() - started) / 1000).toFixed(0)}s`,
    );
  } catch (err) {
    // Keep going: one refused or failed image should not cost the other
    // fifteen, and a missing file falls back to the drawn emblem.
    console.error(`✗ ${archetype.key.padEnd(12)} ${err instanceof Error ? err.message : err}`);
  }
}

console.log(`\n${made} generated · ${skipped} already drawn · ${targets.length - made - skipped} failed`);
console.log("Run `node scripts/avatar-manifest.mjs` to update lib/avatars/manifest.ts.");
