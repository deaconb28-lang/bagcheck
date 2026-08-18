#!/usr/bin/env node
/**
 * Generate the app's ambient fields into `public/ambient/`.
 *
 *   OPENAI_API_KEY=… npm run ambient
 *   npm run ambient -- field-app       # just this one
 *   npm run ambient -- --force         # redraw what exists
 *
 * Three fixed assets, committed, on exactly the reasoning the avatars and the
 * card backdrops already ship on: they belong to no user, they never change,
 * and **a deployment with no key renders the same product** — every surface
 * that reads one of these layers it over a CSS gradient that already says the
 * same thing, so the file is a refinement and never the design.
 *
 * That last part is not politeness. `.env.example` is the contract and CI
 * builds with no secrets at all; a screen that needed this to look finished
 * would be a regression the moment a key expired.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { FIELDS, promptFor } from "../lib/ambient/prompt.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "ambient");
const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set — nothing to generate with.");
  console.error("Every surface that reads these falls back to its own gradient,");
  console.error("so the app is finished without them.");
  process.exit(1);
}

const force = process.argv.includes("--force");
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));

mkdirSync(OUT, { recursive: true });

let made = 0;
let skipped = 0;
const fields = FIELDS.filter((f) => !only.length || only.includes(f.key));

for (const field of fields) {
  const path = join(OUT, `${field.key}.webp`);
  if (!force && existsSync(path)) {
    console.log(`· ${field.key.padEnd(14)} already drawn`);
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
        prompt: promptFor(field),
        /* The nearest supported frame; `sharp` crops to the real one below. */
        size: field.width === field.height ? "1024x1024" : "1536x1024",
        quality: "medium",
        output_format: "png",
        n: 1,
      }),
    });
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);

    const b64 = (await res.json()).data?.[0]?.b64_json;
    if (!b64) throw new Error("response carried no image data");

    /*
     * WebP at a low quality on purpose, and blurred before it is written.
     *
     * These sit behind an interface at 6–20% opacity under a CSS blur, so
     * every bit spent on detail is a bit nobody can see — and this is the one
     * class of asset in the product that may be fetched while a reader is
     * already waiting. Blurring at build time also means the browser is not
     * asked to run a 40px filter over a full-bleed layer on first paint.
     */
    const webp = await sharp(Buffer.from(b64, "base64"))
      .resize(field.width, field.height, { fit: "cover" })
      .blur(18)
      .webp({ quality: 46, effort: 6 })
      .toBuffer();
    writeFileSync(path, webp);
    made += 1;

    const kb = webp.length / 1024;
    console.log(
      `✓ ${field.key.padEnd(14)} ${kb.toFixed(0)}kB  ${((Date.now() - started) / 1000).toFixed(0)}s  — ${field.where}`,
    );
    /*
     * A field is meant to be a handful of kilobytes. Past this it has stopped
     * being atmosphere and started being a picture, and it is being fetched on
     * a screen whose whole job is to fill a wait.
     */
    if (kb > 60) {
      console.warn(`  ! ${field.key} is ${kb.toFixed(0)}kB — heavier than a field should be`);
    }
  } catch (err) {
    /* One failure should not cost the others; a field with no file renders on
     * its own gradient, which is a finished state. */
    console.error(`✗ ${field.key.padEnd(14)} ${err instanceof Error ? err.message : err}`);
  }
}

console.log(`\n${made} generated · ${skipped} already drawn · ${fields.length - made - skipped} failed`);
