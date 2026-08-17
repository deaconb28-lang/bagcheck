#!/usr/bin/env node
/**
 * Measure every hero face, and write `wrapped/metrics.mjs`.
 *
 *   npm run wrapped:metrics
 *
 * `fitHero` sizes a card's hero from the characters it actually holds, and it
 * did that with one constant — 0.555em a glyph — because there was one hero
 * face and it was monospaced. There are seven now, five of them proportional,
 * and a proportional face has no single advance: `111` and `%%%` are not the
 * same width in Playfair, so an estimate is either wrong or so conservative
 * that every hero sets small.
 *
 * So the widths are measured rather than assumed. A headless browser lays each
 * character out in each face at the weight that face's heroes are set at, and
 * the ratios are committed as data. The output is what ships; this script is
 * how you change it, the same way `wrapped:templates` is how the twelve
 * templates change. Re-run it when a face, a weight or the character set moves
 * — `wrapped:check --render` fails loudly if the table and the stylesheet ever
 * disagree, because it measures the drawn hero against the stage.
 *
 * Letter-spacing is measured out and stored separately: CSS applies tracking
 * after every character including the last, so it is `track × length` on top
 * of the sum rather than something to fold into each advance.
 */

import { writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const OUT = new URL("../wrapped/metrics.mjs", import.meta.url);
const CSS = new URL("../wrapped/templates/card.css", import.meta.url);
const FONTS = new URL("../public/fonts/", import.meta.url);

/**
 * Every character a *figure* hero can hold.
 *
 * Words are not in here and never will be: `fitHero` leaves them alone,
 * because a name is allowed to wrap and a per-character estimate of a wrapping
 * line is a guess. This is the set `lib/wrapped/stats.ts` can format into —
 * digits, both minus signs a locale might hand back, the group and decimal
 * separators, and the two symbols a return carries.
 */
const CHARSET = "0123456789+-−.,%$ ";

/**
 * The seven voices, and the weight each one's hero is set at.
 *
 * Kept in step with the `[data-face]` blocks in `card.css` by hand, and the
 * render probe is what catches a drift: it reads the computed weight off the
 * drawn hero and compares it to this table.
 */
const FACES = [
  { key: "machine", family: "Machine", weight: 700 },
  { key: "voice", family: "Voice", weight: 700 },
  { key: "poster", family: "Poster", weight: 400 },
  { key: "serif", family: "Serif", weight: 900 },
  { key: "grotesk", family: "Grotesk", weight: 700 },
  { key: "geometric", family: "Geometric", weight: 800 },
  { key: "lede", family: "Lede", weight: 800 },
];

/** The size everything is measured at. Ratios, so the number only needs precision. */
const AT = 1000;

/*
 * The faces are embedded rather than linked. The page is a string with no
 * origin — same trick the render harness uses — and a measurement taken while
 * a face was still the fallback would be a wrong number committed as data.
 */
const rawCss = await readFile(fileURLToPath(CSS), "utf8");
const faceBlocks = [...rawCss.matchAll(/@font-face\s*{[^}]+}/g)].map((m) => m[0]);
const files = [...rawCss.matchAll(/url\("\/fonts\/([^"]+)"\)/g)].map((m) => m[1]);
const embedded = new Map(
  await Promise.all(
    files.map(async (file) => [
      file,
      (await readFile(fileURLToPath(new URL(file, FONTS)))).toString("base64"),
    ]),
  ),
);
const fontCss = faceBlocks
  .join("\n")
  .replace(
    /url\("\/fonts\/([^"]+)"\)/g,
    (_, file) => `url(data:font/woff2;base64,${embedded.get(file)})`,
  )
  /* `swap` would let a measurement start against the fallback. */
  .replace(/font-display:\s*swap;/g, "font-display: block;");

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
await page.setContent(`<!doctype html><meta charset="utf-8"><style>${fontCss}
  body { margin: 0 }
  span { display: inline-block; white-space: pre; letter-spacing: 0; font-size: ${AT}px }
</style><body></body>`);
const measured = await page.evaluate(
  async ({ faces, charset, at }) => {
    const out = {};
    for (const face of faces) {
      /*
       * `check` reports whether a face is *already* usable; it does not fetch
       * one. Every measurement came back at the fallback's 0.5em until this
       * asked for the load first.
       */
      await document.fonts.load(`${face.weight} ${at}px "${face.family}"`, charset);
      const loaded = document.fonts.check(`${face.weight} ${at}px "${face.family}"`);
      const advance = {};
      for (const ch of charset) {
        const el = document.createElement("span");
        el.style.fontFamily = `"${face.family}"`;
        el.style.fontWeight = String(face.weight);
        el.style.fontVariantNumeric = "tabular-nums";
        /*
         * Ten copies, then divided. One glyph at 1000px still rounds to a
         * whole pixel in `getBoundingClientRect`, and a 0.5px error on a
         * five-character hero is a hero five pixels wider than the table says.
         */
        el.textContent = ch.repeat(10);
        document.body.append(el);
        advance[ch] = el.getBoundingClientRect().width / 10 / at;
        el.remove();
      }
      out[face.key] = { loaded, advance };
    }
    return out;
  },
  { faces: FACES, charset: CHARSET, at: AT },
);

await browser.close();

/*
 * The tracking and the cap, read out of the stylesheet rather than restated.
 * Two numbers that must agree with two numbers is a drift waiting to happen,
 * and this file is generated anyway.
 */
function fromCss(face, prop, fallback) {
  const block =
    face === "machine"
      ? /\.card\s*{([\s\S]*?)}/.exec(rawCss)?.[1]
      : new RegExp(`\\.card\\[data-face="${face}"\\]\\s*{([\\s\\S]*?)}`).exec(rawCss)?.[1];
  const hit = block && new RegExp(`--${prop}:\\s*([^;]+);`).exec(block)?.[1];
  return hit ? hit.trim() : fallback;
}

const rows = [];
let bad = 0;
for (const face of FACES) {
  const m = measured[face.key];
  if (!m.loaded) {
    console.error(`  ✗ ${face.key}: ${face.family} ${face.weight} never loaded`);
    bad += 1;
  }
  const track = Number(fromCss(face.key, "hero-track", "-0.045em").replace("em", ""));
  const cap = Number(fromCss(face.key, "hero-cap", "380px").replace("px", ""));
  const widths = Object.entries(m.advance)
    .map(([ch, w]) => `    ${JSON.stringify(ch)}: ${w.toFixed(4)},`)
    .join("\n");
  /* The widest measured glyph, for anything the charset does not name. */
  const widest = Math.max(...Object.values(m.advance));
  rows.push(
    `  ${face.key}: {\n` +
      `    track: ${track},\n` +
      `    cap: ${cap},\n` +
      `    widest: ${widest.toFixed(4)},\n` +
      `    advance: {\n${widths.replace(/^ {4}/gm, "      ")}\n    },\n` +
      `  },`,
  );
  console.log(
    `  ${face.key.padEnd(10)} ${face.family.padEnd(10)} ${face.weight}  ` +
      `digit ${m.advance["0"].toFixed(3)}em  track ${track}em  cap ${cap}px`,
  );
}

const file = `/**
 * Hero glyph advances, per face, in em at the weight that face's heroes set at.
 *
 * GENERATED by \`npm run wrapped:metrics\` — do not hand-edit. It exists because
 * \`fitHero\` sizes a hero by arithmetic rather than by measurement: the fit runs
 * in Node on the way to a page, where there is no browser to ask. One constant
 * was enough while every hero was monospaced; seven faces later it is a table.
 *
 * \`track\` is the letter-spacing that face's heroes carry, in em, and it applies
 * once per character — including the last, which is how CSS does it. \`cap\` is
 * the largest that face is allowed to be set at. \`widest\` is the fallback for a
 * character the set does not name, so an unexpected glyph makes a hero smaller
 * rather than wider than the stage.
 */

/** @type {Record<string, {track: number, cap: number, widest: number, advance: Record<string, number>}>} */
export const HERO_METRICS = {
${rows.join("\n")}
};

/** The face a card with no \`data-face\` sets its hero in. */
export const DEFAULT_FACE = "machine";
`;

await writeFile(fileURLToPath(OUT), file);
console.log(`\nwrapped/metrics.mjs written${bad ? ` — ${bad} face(s) failed to load` : ""}`);
process.exit(bad ? 1 : 0);
