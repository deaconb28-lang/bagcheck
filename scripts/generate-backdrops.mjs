#!/usr/bin/env node
/**
 * Generate one card backdrop per kind into `public/cards/`.
 *
 *   OPENAI_API_KEY=… npm run backdrops
 *   npm run backdrops -- equity cadence   # just these
 *   npm run backdrops -- --force          # redraw what exists
 *
 * Twelve fixed assets, committed, same reasoning as the avatars: they belong
 * to no user, they never change, and a deployment with no OpenAI key renders
 * the same product on the flat hue gradient underneath.
 *
 * The scene for each kind comes from `lib/wrapped/scenes.ts` and the light
 * from the kind's own hue, so a card's picture and its type carry the same
 * statement. Twelve cards on four shared backdrops read as four cards printed
 * three times each.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { SCENE } from "../lib/wrapped/scenes.ts";
import { artPrompt } from "../lib/wrapped/prompt.ts";
import { buildCards } from "../lib/cards/kinds.ts";
import { exampleLedger } from "../app/(marketing)/exampleLedger.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public", "cards");
const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";

/** 2:3, and 720×1080 is comfortably past the 480px a card ever renders at. */
const W = 720;
const H = 1080;

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set — nothing to generate with.");
  process.exit(1);
}

const force = process.argv.includes("--force");
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));

/*
 * The hue for each kind comes from the kinds table itself rather than from a
 * second list here — one example ledger earns all twelve, and reading the hue
 * off those cards means this script cannot drift from what renders.
 */
const HUE = Object.fromEntries(buildCards(exampleLedger(2026)).map((c) => [c.kind, c.hue]));

mkdirSync(OUT, { recursive: true });

let made = 0;
let skipped = 0;
const kinds = Object.keys(SCENE).filter((k) => !only.length || only.includes(k));

for (const kind of kinds) {
  const path = join(OUT, `${kind}.jpg`);
  if (!force && existsSync(path)) {
    console.log(`· ${kind.padEnd(14)} already drawn`);
    skipped += 1;
    continue;
  }

  const started = Date.now();
  const prompt = artPrompt({
    year: 2026,
    archetype: "",
    dominant: "consistency",
    scoredDays: 0,
    longestHold: null,
    hue: HUE[kind] ?? "moss",
    scene: SCENE[kind],
  });

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        prompt,
        size: "1024x1536",
        quality: "medium",
        output_format: "png",
        n: 1,
      }),
    });
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);

    const b64 = (await res.json()).data?.[0]?.b64_json;
    if (!b64) throw new Error("response carried no image data");

    const png = await sharp(Buffer.from(b64, "base64"))
      .resize(W, H, { fit: "cover" })
      /*
       * JPEG, not PNG. These are photographic gradients with no transparency:
       * the first pass wrote 13MB of PNG for twelve of them, which is a repo
       * carrying a CDN's worth of binary. Satori decodes JPEG, so the OG
       * renderer is unaffected.
       */
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    writeFileSync(path, png);
    made += 1;
    console.log(
      `✓ ${kind.padEnd(14)} ${(HUE[kind] ?? "moss").padEnd(7)} ${(png.length / 1024).toFixed(0)}kB  ${((Date.now() - started) / 1000).toFixed(0)}s`,
    );
  } catch (err) {
    // One failure should not cost the other eleven; a kind with no file
    // renders on its hue gradient, which is a finished state.
    console.error(`✗ ${kind.padEnd(14)} ${err instanceof Error ? err.message : err}`);
  }
}

console.log(`\n${made} generated · ${skipped} already drawn · ${kinds.length - made - skipped} failed`);
