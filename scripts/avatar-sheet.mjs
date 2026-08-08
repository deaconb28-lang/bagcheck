#!/usr/bin/env node
/**
 * Compose the sixteen avatars into one contact sheet for review.
 *
 *   npm run avatars:sheet          # writes public/archetypes/_sheet.png
 *
 * The set matters more than any one mark: sixteen images generated one at a
 * time can each be good and still fail as a family — two that read the same
 * at 44px, one that is twice as dense as the rest. This is the only way to
 * see that, and it is why the sheet is a script rather than a thing done by
 * eye in a file browser.
 *
 * The output is written next to the avatars but prefixed with an underscore,
 * and is not referenced by the app.
 */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { ARCHETYPES } from "../lib/archetypes.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(ROOT, "public", "archetypes");

const CELL = 200;
const GAP = 12;
const COLS = 4;

const rows = Math.ceil(ARCHETYPES.length / COLS);
const width = COLS * CELL + (COLS + 1) * GAP;
const height = rows * CELL + (rows + 1) * GAP;

const tiles = [];
for (const [i, archetype] of ARCHETYPES.entries()) {
  const path = join(DIR, `${archetype.key}.png`);
  if (!existsSync(path)) continue;
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  tiles.push({
    input: await sharp(path).resize(CELL, CELL, { fit: "cover" }).toBuffer(),
    left: GAP + col * (CELL + GAP),
    top: GAP + row * (CELL + GAP),
  });
}

await sharp({
  create: { width, height, channels: 3, background: { r: 12, g: 11, b: 9 } },
})
  .composite(tiles)
  .png()
  .toFile(join(DIR, "_sheet.png"));

console.log(`${tiles.length}/${ARCHETYPES.length} on the sheet → public/archetypes/_sheet.png`);
