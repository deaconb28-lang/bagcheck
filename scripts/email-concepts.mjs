#!/usr/bin/env node
/**
 * Three directions for the two weekly emails, rendered and photographed.
 *
 * Exploration, not product: nothing here is imported by the app. When a
 * direction is chosen it gets built properly in `lib/email/render.ts`, which
 * is the only place email markup is allowed to live.
 *
 * The figures are a fixture. They exist so the layouts can be judged with
 * realistic strings in them — "+$1,284" sets differently from "+$84" — and
 * none of them is read from a ledger.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { chromium } from "playwright-core";

const CHROME = "/opt/pw-browsers/chromium";
const OUT = ".shots-email/concepts";
mkdirSync(OUT, { recursive: true });

/* ── Ground ──────────────────────────────────────────────────────────────
 * The product is black with rationed colour, so its mail is too. Every hex
 * here is a literal on purpose: an email carries no stylesheet and no custom
 * properties. Keep them in step with tokens.css.
 */
const T = {
  field: "#08090A",
  plate: "#101113",
  ink: "#FDFCFA",
  dim: "rgba(253,252,250,.54)",
  faint: "rgba(253,252,250,.30)",
  line: "rgba(253,252,250,.10)",
  gold: "#FFC857", // the score, and only the score
  moss: "#35E07F", // money up, and only money up
  loss: "#FF5A70",
  signal: "#A4B0BD", // comparison and exposure
  accent: "#A78BFA", // the product's own written voice
};

/*
 * The product's own faces, embedded so the mockups render in the real type.
 * Every stack keeps an honest fallback: Gmail strips @font-face, so the
 * fallback IS the design in a large share of inboxes.
 */
const face = (file) =>
  `data:font/woff2;base64,${readFileSync(`public/fonts/${file}`).toString("base64")}`;
const FONTS = `
@font-face{font-family:Anton;src:url(${face("anton-latin.woff2")}) format('woff2');font-weight:400}
@font-face{font-family:Machine;src:url(${face("jetbrains-mono-latin.woff2")}) format('woff2');font-weight:400}
@font-face{font-family:Voice;src:url(${face("general-sans-500.woff2")}) format('woff2');font-weight:500}
@font-face{font-family:VoiceBold;src:url(${face("general-sans-700.woff2")}) format('woff2');font-weight:700}
@font-face{font-family:Grot;src:url(${face("space-grotesk-latin.woff2")}) format('woff2');font-weight:400}
`;
const POSTER = `Anton, 'Arial Black', 'Helvetica Neue', Impact, sans-serif`;
const MONO = `Machine, ui-monospace, SFMono-Regular, Menlo, monospace`;
const VOICE = `Voice, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`;
const BOLD = `VoiceBold, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif`;
const NUM = `Grot, 'Helvetica Neue', Arial, sans-serif`;

/* ── The fixture ─────────────────────────────────────────────────────── */
const MON = {
  kind: "monday",
  eyebrow: "Monday brief",
  stamp: "MON 24 AUG · WK 35",
  score: 74,
  delta: +3,
  against: "against Friday's 71",
  insight: "Trade count above your baseline. Your score moved down 2.",
  archetype: "The Steward",
  /* Never the score: the hero already states it, and one figure twice in
     one email is the same measurement pretending to be two. */
  fields: [
    ["Streak", "12", "ink"],
    ["Untagged", "6", "ink"],
    ["Personal best", "88", "ink"],
  ],
  week: [68, 71, 70, 74, 71],
  lead: "Twelve sessions inside your rules.",
  body: "Your score read 74 this morning, three above Friday's 71. Six entries are still without a reason — two taps each, and every pattern the engine finds is downstream of them.",
  /* Prose already names 74, 71 and 6, so the row repeats none of them. */
  letterFields: [["Personal best", "88", "ink"], ["Reading as", "The Steward", "ink"]],
};
const FRI = {
  kind: "friday",
  eyebrow: "Friday recap",
  stamp: "FRI 21 AUG · WK 34",
  score: 74,
  delta: +3,
  against: "across 5 scored days",
  insight: "You held winners about a fifth longer than losers this week.",
  archetype: "The Steward",
  fields: [
    ["Realised", "+$1,284", "moss"],
    ["Sessions", "3 / 2", "ink"],
    ["Longest hold", "61d", "ink"],
  ],
  week: [70, 72, 69, 76, 74],
  lead: "Three green sessions to two red.",
  body: "You closed the week at 74, three up across five scored days. The longest position still open is sixty-one days.",
  /* The letter names 74 and 61 in prose, so its row states neither. */
  letterFields: [["Realised", "+$1,284", "moss"], ["Scored days", "5", "ink"]],
};

const signed = (n) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}`;
const tone = (k) => ({ gold: T.gold, moss: T.moss, loss: T.loss, ink: T.ink }[k] ?? T.ink);

/** Four bands, the same table `lib/score/shape.ts` uses. */
const band = (s) => (s >= 94 ? 1 : s >= 78 ? 0.72 : s >= 64 ? 0.44 : 0.2);

const shell = (inner, bg = T.field) => `<!doctype html><html><head><meta charset="utf-8">
<style>${FONTS}</style></head>
<body style="margin:0;background:${bg};-webkit-font-smoothing:antialiased">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg}">
<tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="616" cellpadding="0" cellspacing="0" style="width:616px">
${inner}
</table></td></tr></table></body></html>`;

/* ══ A · BOARDING PASS ═══════════════════════════════════════════════════
 *
 * The one artefact in aviation that is personal, dense with codes, and worth
 * holding on to. Its *fields* are a real taxonomy, which is why they are the
 * structural device here — a boarding pass earns its labels, where a numbered
 * 01/02/03 would be decoration.
 *
 * The perforation is the signature: a pass tears, and the stub is the half
 * you keep.
 */
function pass(d) {
  const field = ([label, value, t]) => `
    <td width="33%" style="padding:0 0 2px">
      <div style="font-family:${MONO};font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:${T.faint};padding-bottom:7px">${label}</div>
      <div style="font-family:${NUM};font-size:26px;font-weight:700;letter-spacing:-.03em;color:${tone(t)}">${value}</div>
    </td>`;
  return shell(`
  <tr><td style="background:${T.plate};border-radius:20px 20px 0 0;padding:26px 30px 22px">
    <table role="presentation" width="100%"><tr>
      <td style="font-family:${MONO};font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${T.ink}">SUPERCRUISE</td>
      <td align="right" style="font-family:${MONO};font-size:10px;letter-spacing:.16em;color:${T.faint}">${d.stamp}</td>
    </tr></table>

    <div style="font-family:${MONO};font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:${T.accent};padding:30px 0 12px">${d.eyebrow}</div>

    <div style="font-family:${POSTER};font-size:104px;line-height:.88;letter-spacing:-.01em;color:${T.gold}">${d.score}</div>
    <div style="padding:12px 0 0">
      <span style="font-family:${MONO};font-size:12px;letter-spacing:.06em;color:${d.delta >= 0 ? T.moss : T.loss}">${signed(d.delta)}</span>
      <span style="font-family:${VOICE};font-size:13px;color:${T.faint}">&nbsp;${d.against}</span>
    </div>

    <div style="font-family:${VOICE};font-size:15px;line-height:1.55;color:${T.ink};padding:22px 0 0;max-width:44ch">${d.insight}</div>
  </td></tr>

  <!-- The tear. Two notches and a dashed rule: the pass comes apart here. -->
  <tr><td style="background:${T.plate};padding:0">
    <table role="presentation" width="100%"><tr>
      <td width="14" style="height:26px"><div style="width:26px;height:26px;margin-left:-13px;border-radius:999px;background:${T.field}"></div></td>
      <td style="border-bottom:1px dashed rgba(253,252,250,.22)"></td>
      <td width="14"><div style="width:26px;height:26px;margin-right:-13px;border-radius:999px;background:${T.field}"></div></td>
    </tr></table>
  </td></tr>

  <tr><td style="background:${T.plate};border-radius:0 0 20px 20px;padding:24px 30px 28px">
    <table role="presentation" width="100%"><tr>${d.fields.map(field).join("")}</tr></table>
    <table role="presentation" width="100%" style="padding-top:24px"><tr>
      <td style="border-top:1px solid ${T.line};padding-top:16px">
        <div style="font-family:${MONO};font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:${T.faint};padding-bottom:6px">Reading as</div>
        <div style="font-family:${BOLD};font-size:17px;letter-spacing:-.01em;color:${T.ink}">${d.archetype}</div>
      </td>
      <td align="right" valign="bottom" style="border-top:1px solid ${T.line};padding-top:16px">
        <a href="#" style="display:inline-block;font-family:${BOLD};font-size:13px;color:${T.field};background:${T.ink};text-decoration:none;padding:11px 18px;border-radius:999px">Open the week</a>
      </td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:16px 30px 0;font-family:${MONO};font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:${T.faint}">
    Read from your brokerage · two a week · <a href="#" style="color:${T.faint}">stop these</a>
  </td></tr>`);
}

/* ══ B · INSTRUMENT STRIP ════════════════════════════════════════════════
 *
 * The week as one lit readout. Five cells, one per trading day, each at the
 * strength of its own band — you read which days were good in a single
 * left-to-right sweep, before any figure is parsed. That is the speed.
 *
 * It is the app's own vocabulary posted into an inbox, which is the argument
 * for it: nothing new to learn.
 */
function strip(d) {
  /*
   * Each day states its own score in type, on a fill at its band strength.
   *
   * The fill alone was the whole device and it failed: a normal week sits
   * inside one band, so five cells came back the same mustard and the strip
   * said nothing. A figure differs even when a band does not — and stating a
   * reading in type as well as in fill is what this product does everywhere
   * else anyway.
   */
  const day = (s, i) => `
    <td width="20%" style="padding:0 3px">
      <div style="border-radius:10px;background:rgba(255,200,87,${0.10 + band(s) * 0.20});padding:16px 0;text-align:center">
        <div style="font-family:${NUM};font-size:24px;font-weight:700;letter-spacing:-.03em;color:${T.gold}">${s}</div>
      </div>
      <div style="font-family:${MONO};font-size:9px;letter-spacing:.14em;text-align:center;color:${T.faint};padding-top:9px">${["MON","TUE","WED","THU","FRI"][i]}</div>
    </td>`;
  const meter = ([label, value, t]) => `
    <tr><td style="padding:13px 0;border-top:1px solid ${T.line}">
      <table role="presentation" width="100%"><tr>
        <td style="font-family:${MONO};font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${T.faint}">${label}</td>
        <td align="right" style="font-family:${NUM};font-size:18px;font-weight:700;letter-spacing:-.02em;color:${tone(t)}">${value}</td>
      </tr></table>
    </td></tr>`;
  return shell(`
  <tr><td style="padding:0 4px 22px">
    <table role="presentation" width="100%"><tr>
      <td style="font-family:${MONO};font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${T.accent}">${d.eyebrow}</td>
      <td align="right" style="font-family:${MONO};font-size:10px;letter-spacing:.16em;color:${T.faint}">${d.stamp}</td>
    </tr></table>
  </td></tr>

  <tr><td style="background:${T.plate};border-radius:22px;padding:30px 30px 26px">
    <table role="presentation" width="100%"><tr>
      <td valign="bottom" style="font-family:${POSTER};font-size:92px;line-height:.82;color:${T.gold};text-shadow:0 0 38px rgba(255,200,87,.22)">${d.score}</td>
      <td valign="bottom" align="right" style="padding-bottom:12px">
        <div style="font-family:${MONO};font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:${T.faint};padding-bottom:6px">This week</div>
        <div style="font-family:${NUM};font-size:22px;font-weight:700;color:${d.delta >= 0 ? T.moss : T.loss}">${signed(d.delta)}</div>
      </td>
    </tr></table>

    <!-- The signature: the week itself, lit day by day. -->
    <table role="presentation" width="100%" style="padding:26px 0 4px"><tr>${d.week.map(day).join("")}</tr></table>

    <div style="font-family:${VOICE};font-size:15px;line-height:1.55;color:${T.ink};padding:22px 0 20px;max-width:46ch">${d.insight}</div>

    <table role="presentation" width="100%">${d.fields.map(meter).join("")}</table>

    <table role="presentation" width="100%" style="padding-top:8px"><tr>
      <td><a href="#" style="display:inline-block;font-family:${BOLD};font-size:13px;color:${T.field};background:${T.ink};text-decoration:none;padding:11px 18px;border-radius:999px">Open the week</a></td>
      <td align="right" style="font-family:${MONO};font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${T.faint}">${d.archetype}</td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:16px 4px 0;font-family:${MONO};font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:${T.faint}">
    Read from your brokerage · two a week · <a href="#" style="color:${T.faint}">stop these</a>
  </td></tr>`);
}

/* ══ C · POSTER ══════════════════════════════════════════════════════════
 *
 * One figure, enormous, with the mark's own 124° contrail crossing behind it.
 * There is exactly one thing to read, which is the fastest an email can be,
 * and it arrives looking like a Wrapped card rather than a report.
 *
 * The cost is honest: it carries the least. It is the direction to pick if
 * the job of these emails is to be opened and screenshotted rather than
 * studied.
 */
function poster(d) {
  const fact = ([label, value, t]) => `
    <td style="padding:0 18px 0 0">
      <span style="font-family:${MONO};font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:${T.faint}">${label}</span>
      <span style="font-family:${NUM};font-size:14px;font-weight:700;color:${tone(t)};padding-left:7px">${value}</span>
    </td>`;
  return shell(`
  <tr><td style="position:relative;background:${T.plate};border-radius:24px;padding:0;overflow:hidden">
    <div style="position:relative;padding:34px 34px 30px">
      <!-- The contrail, on the mark's own axis, behind everything. -->
      <div style="position:absolute;inset:0;background:linear-gradient(124deg,transparent 0,transparent 46.4%,rgba(253,252,250,.20) 46.7%,rgba(253,252,250,.05) 47.4%,rgba(253,252,250,.02) 50%,transparent 56%)"></div>
      <div style="position:relative">
        <table role="presentation" width="100%"><tr>
          <td style="font-family:${MONO};font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:${T.ink}">SUPERCRUISE</td>
          <td align="right" style="font-family:${MONO};font-size:10px;letter-spacing:.16em;color:${T.faint}">${d.stamp}</td>
        </tr></table>

        <div style="font-family:${MONO};font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:${T.accent};padding:46px 0 0">${d.eyebrow}</div>

        <div style="font-family:${POSTER};font-size:188px;line-height:1;letter-spacing:-.02em;color:${T.gold};padding:14px 0 0;text-shadow:0 0 80px rgba(255,200,87,.26)">${d.score}</div>

        <div style="font-family:${MONO};font-size:12px;letter-spacing:.06em;color:${d.delta >= 0 ? T.moss : T.loss};padding:14px 0 0">
          ${signed(d.delta)} <span style="color:${T.faint}">${d.against}</span>
        </div>

        <div style="font-family:${VOICE};font-size:17px;line-height:1.5;color:${T.ink};padding:26px 0 30px;max-width:36ch">${d.insight}</div>

        <table role="presentation" width="100%" style="border-top:1px solid ${T.line}"><tr>
          <td style="padding-top:18px"><table role="presentation"><tr>${d.fields.map(fact).join("")}</tr></table></td>
        </tr></table>

        <table role="presentation" width="100%" style="padding-top:22px"><tr>
          <td><a href="#" style="display:inline-block;font-family:${BOLD};font-size:13px;color:${T.field};background:${T.ink};text-decoration:none;padding:11px 18px;border-radius:999px">Open the week</a></td>
          <td align="right" style="font-family:${MONO};font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:${T.faint}">${d.archetype}</td>
        </tr></table>
      </div>
    </div>
  </td></tr>

  <tr><td style="padding:16px 6px 0;font-family:${MONO};font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:${T.faint}">
    Read from your brokerage · two a week · <a href="#" style="color:${T.faint}">stop these</a>
  </td></tr>`);
}


/* ── The light world ─────────────────────────────────────────────────────
 *
 * White, near-black ink, and the marketing field's contrast-safe green and
 * violet. These are the `--mk-*` tokens the landing already speaks — not a
 * new cream invented for email. An inbox is a light room, and a black
 * message sitting in a white thread reads as an advert; the product's own
 * white editorial world is the honest place for a letter to come from.
 */
const L = {
  bg: "#ffffff",
  ink: "#0b0b0c",
  ink2: "#4b4b52",
  ink3: "#6b7280",
  line: "#e6e6ea",
  green: "#0c6f37", // --mk-green-ink: the green that clears 4.5:1 on white
  red: "#b3132f",
  violet: "#7c3aed",
  field: "#0b0b12", // the dark foot
};

/** The dart, from the mark's own geometry, in currentColor. */
const MARK = (size, opacity = 1) => `
<svg width="${size}" height="${size}" viewBox="0 0 34 34" fill="none" style="opacity:${opacity}">
  <circle cx="17" cy="17" r="13" pathLength="100" stroke="currentColor" stroke-width="2"
    stroke-dasharray="37 13 37 13" stroke-dashoffset="6" stroke-linecap="butt"/>
  <path d="M28 5.6 L9.6 16.8 L16.7 19.2 L17.3 26.4 Z" fill="currentColor"/>
  <path d="M13.4 22.8 L7.2 29" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
  <path d="M8.4 18.8 L3 24.2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" opacity=".7"/>
</svg>`;

/* == D / E · LETTER =====================================================
 *
 * The lead is a *sentence*, not a figure. What Supercruise knows that a
 * brokerage app does not is what the conduct looked like, and conduct is
 * something you say in words — "twelve sessions inside your rules" lands
 * where "12" needs a label before it means anything.
 *
 * The reference this came from sells a referral off a streak and asks
 * whether your friends can beat it. That half is deliberately left behind:
 * this product has no population to compare anyone against, its copy is
 * descriptive rather than prescriptive, and its lede never asks a question.
 * What is taken is the *form* — a light room, type big enough to read at
 * arm's length, one outlined action, and a dark foot to close it.
 *
 * `big` decides whether the figure shouts. It is the real tension in this
 * direction: a letter reads slower than a poster, and the numeral is what
 * buys the speed back.
 */
function letter(d, big) {
  const fact = ([label, value, t]) => `
    <td style="padding:0 22px 0 0;white-space:nowrap">
      <div style="font-family:${MONO};font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:${L.ink3};padding-bottom:6px">${label}</div>
      <div style="font-family:${NUM};font-size:19px;font-weight:700;letter-spacing:-.02em;color:${t === "moss" ? L.green : L.ink}">${value}</div>
    </td>`;
  return shell(`
  <tr><td style="background:${L.ink};padding:15px 30px">
    <table role="presentation" width="100%"><tr>
      <td style="color:${L.bg};font-family:${MONO};font-size:10px;letter-spacing:.22em;text-transform:uppercase">SUPERCRUISE</td>
      <td align="right" style="font-family:${MONO};font-size:10px;letter-spacing:.16em;color:rgba(255,255,255,.55)">${d.stamp}</td>
    </tr></table>
  </td></tr>

  <tr><td style="background:${L.bg};padding:38px 30px 34px">
    <div style="font-family:${MONO};font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:${L.violet};padding-bottom:${big ? 14 : 20}px">${d.eyebrow}</div>

    ${
      big
        ? `<div style="font-family:${POSTER};font-size:132px;line-height:.94;letter-spacing:-.02em;color:${L.ink}">${d.score}</div>
    <div style="padding:12px 0 28px">
      <span style="font-family:${MONO};font-size:12px;letter-spacing:.06em;color:${d.delta >= 0 ? L.green : L.red}">${signed(d.delta)}</span>
      <span style="font-family:${VOICE};font-size:13px;color:${L.ink3}">&nbsp;${d.against}</span>
    </div>`
        : ""
    }

    <div style="font-family:${BOLD};font-size:${big ? 24 : 30}px;line-height:1.24;letter-spacing:-.02em;color:${L.ink};max-width:${big ? 26 : 19}ch">${d.lead}</div>

    <div style="font-family:${VOICE};font-size:17px;line-height:1.62;color:${L.ink2};padding:20px 0 0;max-width:44ch">${d.body}</div>

    <div style="font-family:${VOICE};font-size:17px;line-height:1.62;color:${L.violet};padding:16px 0 0;max-width:44ch">${d.insight}</div>

    <table role="presentation" style="padding:30px 0 0"><tr>${(d.letterFields ?? d.fields).map(fact).join("")}</tr></table>

    <div style="padding:32px 0 4px">
      <a href="#" style="display:inline-block;font-family:${BOLD};font-size:15px;letter-spacing:.01em;color:${L.ink};border:1.5px solid ${L.ink};text-decoration:none;padding:16px 34px;border-radius:999px">Open your week</a>
    </div>
  </td></tr>

  <tr><td style="background:${L.field};padding:34px 30px 30px">
    <div style="color:rgba(255,255,255,.24)">${MARK(52)}</div>
    <div style="font-family:${BOLD};font-size:14px;color:${L.bg};padding:18px 0 8px">Supercruise</div>
    <div style="font-family:${MONO};font-size:10px;line-height:1.9;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.46)">
      Read from your brokerage · nothing is ever traded<br>
      Two a week: Monday morning and Friday evening<br>
      <a href="#" style="color:rgba(255,255,255,.46)">Stop these emails</a>
    </div>
  </td></tr>`, L.bg);
}

const ANGLES = [
  ["a-pass", "Boarding pass", pass],
  ["b-strip", "Instrument strip", strip],
  ["c-poster", "Poster", poster],
  ["d-letter", "Letter", (d) => letter(d, false)],
  ["e-letter-figure", "Letter, with the figure", (d) => letter(d, true)],
];

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 640, height: 900 }, deviceScaleFactor: 2 });

for (const [key, name, render] of ANGLES) {
  for (const d of [MON, FRI]) {
    const file = `${OUT}/${key}-${d.kind}.html`;
    writeFileSync(file, render(d));
    await page.goto(`file://${process.cwd()}/${file}`);
    await page.screenshot({ path: `${OUT}/${key}-${d.kind}.png`, fullPage: true });
  }
  console.log(`${key.padEnd(10)} ${name}`);
}

await browser.close();
console.log(`\n${ANGLES.length * 2} renders in ${OUT}/`);
