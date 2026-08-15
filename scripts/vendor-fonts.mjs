#!/usr/bin/env node
/**
 * Vendor every face into `public/fonts`.
 *
 * `next/font/google` downloads its woff2 files from `fonts.gstatic.com`
 * *during the build*, which makes every build a coin flip on a third party
 * answering. It came up tails on CI run 31859584940 and took the whole build
 * with it:
 *
 *   Failed to fetch `Playfair Display` from Google Fonts.
 *   > Build failed because of webpack errors
 *
 * So the files live in the repo and the build touches no network. Run this
 * again only to add or update a face — the output is committed.
 *
 * Only the latin and latin-extended subsets are kept. This product ships one
 * language, and the cyrillic/greek/vietnamese cuts Google also serves would
 * be a megabyte of bytes nobody in it will ever render.
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const OUT = new URL("../public/fonts/", import.meta.url);

/* A modern UA, or Google serves the ttf fallback rather than woff2. */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Latin and latin-ext both start in the ASCII/Latin-1 range. */
function wantedSubset(range) {
  return range.includes("U+0000-00FF") || range.includes("U+0100-02BA");
}

const GOOGLE = [
  { file: "space-grotesk", query: "Space+Grotesk:wght@300..700" },
  { file: "playfair-display", query: "Playfair+Display:wght@400..900" },
  { file: "public-sans", query: "Public+Sans:wght@100..900" },
  { file: "jetbrains-mono", query: "JetBrains+Mono:wght@100..800" },
  { file: "anton", query: "Anton" },
  { file: "outfit", query: "Outfit:wght@100..900" },
];

/*
 * General Sans is Fontshare's, under the ITF Free Font Licence, which permits
 * self-hosting. It was loaded at *runtime* by a <link> in three separate
 * layouts, so every reader's browser hit fontshare on every page — a third
 * party in the critical render path that the privacy policy never named.
 */
const FONTSHARE = "https://api.fontshare.com/v2/css?f%5B%5D=general-sans@400,500,600,700&display=swap";

async function get(url, asText) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return asText ? res.text() : Buffer.from(await res.arrayBuffer());
}

/**
 * Split a CSS payload into @font-face blocks with their fields.
 *
 * The URL match tolerates both shapes we fetch: Google's bare
 * `url(https://…woff2)` and Fontshare's quoted, protocol-relative
 * `url('//cdn.fontshare.com/…woff2')`.
 */
function faces(css) {
  return [...css.matchAll(/@font-face\s*{([^}]+)}/g)].map((m) => {
    const body = m[1];
    const field = (name) => body.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim() ?? "";
    const raw = body.match(/url\(\s*['"]?((?:https:)?\/\/[^)'"]+\.woff2)['"]?\s*\)/)?.[1] ?? null;
    return {
      url: raw ? (raw.startsWith("//") ? `https:${raw}` : raw) : null,
      range: field("unicode-range"),
      weight: field("font-weight"),
      style: field("font-style"),
    };
  });
}

await mkdir(OUT, { recursive: true });
const written = [];

for (const { file, query } of GOOGLE) {
  const css = await get(
    `https://fonts.googleapis.com/css2?family=${query}&display=swap`,
    true,
  );
  const keep = faces(css).filter((f) => f.url && wantedSubset(f.range));
  if (!keep.length) throw new Error(`no latin subset found for ${file}`);

  /*
   * Google emits one @font-face per subset, latin last. Both latin and
   * latin-ext are kept and merged into one file per family only when the
   * family is variable — which all of these are except Anton, where the two
   * subsets are separate files and the latin one is what we want.
   */
  let index = 0;
  for (const face of keep) {
    const suffix = keep.length > 1 ? `-${index === keep.length - 1 ? "latin" : "latin-ext"}` : "";
    const name = `${file}${suffix}.woff2`;
    await writeFile(new URL(name, OUT), await get(face.url, false));
    written.push({ name, weight: face.weight, style: face.style });
    index += 1;
  }
}

const fsCss = await get(FONTSHARE, true);
for (const face of faces(fsCss)) {
  if (!face.url) continue;
  const weight = face.weight.replace(/\s+/g, "");
  const name = `general-sans-${weight}.woff2`;
  await writeFile(new URL(name, OUT), await get(face.url, false));
  written.push({ name, weight, style: face.style });
}

for (const { name, weight, style } of written) {
  const bytes = (await readFile(new URL(name, OUT))).length;
  console.log(`${name.padEnd(34)} ${String(weight).padEnd(10)} ${style.padEnd(7)} ${(bytes / 1024).toFixed(0)}kB`);
}
console.log(`\n${written.length} files in public/fonts`);

void existsSync;
void join;
