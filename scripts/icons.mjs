#!/usr/bin/env node
/**
 * Draws every raster icon from the dart's own geometry.
 *
 * These are the surfaces nobody looks at from inside the product: they are
 * only ever seen on a home screen or in a tab strip, after somebody has
 * deliberately saved the site. `app/apple-icon.png` was last written in a
 * commit called "Canopy" — two renames and an entire brand ago — and went on
 * shipping the old dome through Bagcheck, Steadyhands and Supercruise without
 * anyone noticing, which is exactly the failure CLAUDE.md predicts for it.
 *
 * `npm run icons` regenerates them, and it has to run in the same commit as
 * any change to `SupercruiseMark` or `app/icon.svg`.
 *
 * ── Three jobs, three builds ──────────────────────────────────────────────
 *
 * `app/icon.svg` is the favicon and is hand-drawn, not emitted here: at 16px
 * the wake is mud and the ring is a hairline, so it drops the wake and
 * thickens the stroke. It is the one file that needs to look *different* to
 * stay the same.
 *
 * The rasters below carry the full mark, wake included, because none of them
 * is ever drawn under about 120px.
 *
 * **No baked corner radius.** iOS masks the icon into its own superellipse, so
 * a radius drawn here is rounded twice and leaves the ground showing in the
 * corners. The square is full-bleed and the mark is inset instead.
 *
 * **Android needs raster.** The manifest offered an SVG at `sizes: "any"` and
 * the 180px apple icon, and Chrome on Android will not use an SVG for a home
 * screen icon — so an Android reader who installed the app got a generated
 * letter rather than the dart. 192 and 512 are the two sizes it asks for.
 *
 * **Maskable is its own drawing.** Android crops an icon to whatever shape the
 * launcher uses, guaranteeing only the central 80% — and the corners of a
 * square that fills 70% of the frame sit outside that circle. So the maskable
 * build insets much harder rather than reusing the same art and hoping.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const CHROME = "/opt/pw-browsers/chromium";

/*
 * The mark sits at 70% of the square. Apple's own icons keep their artwork
 * inside about two thirds and no smaller — the previous 62% read as a stamp
 * floating in a black tile rather than as an app icon, noticeably smaller than
 * everything beside it on a home screen.
 */
const INSET = 0.15;

/*
 * The maskable safe zone is the circle of radius 40% of the frame. Artwork
 * inside a centred square of side 48% has its own corners at 0.34 of the
 * frame from the centre, which clears it.
 */
const MASKABLE_INSET = 0.26;

/** The full mark, drawn into a 100-unit frame at the given inset. */
const mark = (inset) => `
  <g transform="translate(${inset * 100} ${inset * 100}) scale(${(100 - inset * 200) / 34})">
    <circle cx="17" cy="17" r="13" fill="none" pathLength="100" stroke="#ffffff" stroke-width="2"
      stroke-dasharray="37 13 37 13" stroke-dashoffset="6"/>
    <path d="M28 5.6 L9.6 16.8 L16.7 19.2 L17.3 26.4 Z" fill="#ffffff"/>
    <path d="M13.4 22.8 L7.2 29" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M8.4 18.8 L3 24.2" fill="none" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" opacity="0.7"/>
  </g>`;

const svg = (size, inset) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
    <rect width="100" height="100" fill="#000000"/>${mark(inset)}
  </svg>`;

const TARGETS = [
  { path: "app/apple-icon.png", size: 180, inset: INSET, note: "the home-screen icon iOS masks" },
  { path: "public/icon-192.png", size: 192, inset: INSET, note: "Android, and the manifest's small icon" },
  { path: "public/icon-512.png", size: 512, inset: INSET, note: "Android, and the install prompt" },
  {
    path: "public/icon-maskable-512.png",
    size: 512,
    inset: MASKABLE_INSET,
    note: "Android, cropped to the launcher's own shape",
  },
];

mkdirSync("public", { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME });
for (const { path, size, inset, note } of TARGETS) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0;background:#000">${svg(size, inset)}</body>`, {
    waitUntil: "load",
  });
  writeFileSync(path, await page.screenshot({ omitBackground: false }));
  await page.close();
  console.log(`${path} · ${size}×${size} · ${note}`);
}
await browser.close();
