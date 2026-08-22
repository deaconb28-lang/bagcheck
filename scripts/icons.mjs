#!/usr/bin/env node
/**
 * Draws the home-screen icon from the dart's own geometry.
 *
 * `app/apple-icon.png` is the surface nobody looks at from inside the
 * product: it is only ever seen on a phone's home screen, after somebody has
 * deliberately saved the site. It was last written in a commit called
 * "Canopy" — two renames and an entire brand ago — and went on shipping the
 * old dome through Bagcheck, Steadyhands and Supercruise without anyone
 * noticing, which is exactly the failure CLAUDE.md predicts for it.
 *
 * `npm run icons` regenerates it, and it has to run in the same commit as any
 * change to `SupercruiseMark` or `app/icon.svg`.
 *
 * **No baked corner radius.** iOS masks the icon into its own superellipse,
 * so a radius drawn here is rounded twice and leaves the ground showing in
 * the corners. The square is full-bleed and the mark is inset instead.
 */
import { writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const CHROME = "/opt/pw-browsers/chromium";
const SIZE = 180;

/*
 * The mark sits at 62% of the square. Apple's own icons keep their artwork
 * inside about two thirds, and a dart drawn to the edges reads as a smudge
 * once the mask takes the corners off.
 */
const INSET = 0.19;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#000000"/>
  <g transform="translate(${INSET * 100} ${INSET * 100}) scale(${(100 - INSET * 200) / 34})">
    <circle cx="17" cy="17" r="13" fill="none" pathLength="100" stroke="#ffffff" stroke-width="2"
      stroke-dasharray="37 13 37 13" stroke-dashoffset="6"/>
    <path d="M28 5.6 L9.6 16.8 L16.7 19.2 L17.3 26.4 Z" fill="#ffffff"/>
    <path d="M13.4 22.8 L7.2 29" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M8.4 18.8 L3 24.2" fill="none" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" opacity="0.7"/>
  </g>
</svg>`;

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: SIZE, height: SIZE } });
await page.setContent(
  `<body style="margin:0;background:#000">${svg}</body>`,
  { waitUntil: "load" },
);
const png = await page.screenshot({ omitBackground: false });
writeFileSync("app/apple-icon.png", png);
await browser.close();

console.log(`app/apple-icon.png · ${SIZE}×${SIZE} · the dart, full bleed, no baked radius`);
