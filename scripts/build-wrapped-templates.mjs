#!/usr/bin/env node
/**
 * Writes `wrapped/templates/card-01.html` … `card-12.html`.
 *
 *   npm run wrapped:templates
 *
 * Twelve files, emitted from the one table in `wrapped/cards.mjs` rather than
 * hand-written. They are near-identical by design — same stage, same lockup,
 * same wordmark — and twelve hand-maintained copies of one layout is twelve
 * places for a padding value to drift and one place for a `data-token` to be
 * misspelled, which is the failure the Phase 3 validator would then report as
 * a model error.
 *
 * The output is committed. This script is how you change all twelve at once,
 * not something that runs on a deploy.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { CARDS } from "../wrapped/cards.mjs";

const OUT = new URL("../wrapped/templates/", import.meta.url);

/*
 * The art set the templates point at.
 *
 * Versioned rather than overwritten, because the art and the direction that
 * asked for it are one thing: an image drawn to "near-black luminous gradient"
 * sitting under a card *designed* as a terrazzo slab is worse than no image at
 * all. Bumping this retires the old set without deleting it, and a deck renders
 * on its drawn CSS ground until the new one is generated.
 */
const ART_SET = "chaotic-01";

/*
 * Tokens whose value is a word rather than a figure. They take the body face
 * at a smaller size — "Consolidator" set at 380px in a mono face leaves the
 * stage, and a hero that overflows is not a hero.
 */
const WORD_TOKENS = new Set([
  "USER_NAME",
  "LONGEST_HOLD_TICKER",
  "BEST_TICKER",
  "BUSIEST_MONTH",
  "TOP_SECTOR",
  "ARCHETYPE_NAME",
  "ARCHETYPE_TRAIT",
]);

/** The mono label above a supporting fact. Derived, so it cannot disagree. */
const LABEL = {
  USER_NAME: "For",
  YEAR: "Year",
  TOTAL_RETURN_PCT: "Total return",
  CONTRIBUTION_COUNT: "Contributions",
  CONTRIBUTION_STREAK_WEEKS: "Longest streak",
  LONGEST_HOLD_TICKER: "Instrument",
  LONGEST_HOLD_DAYS: "Days held",
  BEST_TICKER: "Instrument",
  BEST_RETURN_PCT: "Return",
  MAX_DRAWDOWN_PCT: "Deepest drawdown",
  RECOVERY_DAYS: "Days to recover",
  BUSIEST_MONTH: "Month",
  TRADE_COUNT_YEAR: "Trades this year",
  RED_DAY_BUYS: "Buys on red days",
  TOP_SECTOR: "Largest sector",
  TOP_SECTOR_PCT: "Share of book",
  HOLDINGS_COUNT: "Holdings",
  VS_SPY_PCT: "Against the index",
  ARCHETYPE_NAME: "Archetype",
  ARCHETYPE_TRAIT: "Reads as",
  INVESTOR_AGE: "Investor age",
};

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * One card.
 *
 * Every element that holds a token carries `data-token`, and that attribute is
 * the whole of the Phase 3 contract: the validator walks them, reads the text
 * content, and compares it character for character against the stats. An
 * element without one is a value nobody is checking.
 */
function template(card) {
  const heroKind = WORD_TOKENS.has(card.hero) ? "word" : "figure";
  const rest = card.tokens.filter((t) => t !== card.hero);

  const facts = rest
    .map((t) => {
      const kind = WORD_TOKENS.has(t) ? "word" : "figure";
      return `        <div class="fact">
          <span class="factLabel">${esc(LABEL[t] ?? t)}</span>
          <span class="factValue" data-kind="${kind}" data-token="${t}">{{${t}}}</span>
        </div>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>bagcheck · ${esc(card.title)}</title>
<link rel="stylesheet" href="card.css">
</head>
<body>
<!--
  Card ${card.no} — ${card.key}

  A 1080x1920 stage. The art is a background and nothing else; every figure on
  this card is set in type, because a number a model drew is a number nobody
  can correct on an artefact whose whole claim is that it came off a brokerage.

  The five data attributes on the stage are this card's own type direction —
  which voice, where on the stage, from which edge, in which case, and in what
  order the lockup's parts run. card.css answers each of them with a rule per
  axis rather than a rule per card, so twelve posters cost about fifteen rules.
  Every one of the five has a default stated on .card itself, which is what
  lets a card minted before this table existed keep drawing the way it drew.
-->
<div class="card" style="width:1080px;height:1920px" data-card="${card.no}" data-key="${card.key}" data-face="${card.type.face}" data-place="${card.type.place}" data-align="${card.type.align}" data-case="${card.type.case}" data-order="${card.type.order}">
  <!--
    The PNG is the committed source of truth; the WebP is what a reader
    actually downloads. Twelve photographic gradients at 1080x1920 are 38MB as
    PNG and 1.8MB as WebP with nothing visible between them — and the story
    view loads all twelve on a phone. The PNG stays because it is what the
    renderer composites from and what the set was authored as.
  -->
  <picture>
    <source srcset="/wrapped/2026/art/${ART_SET}/bg-${card.no}.webp" type="image/webp">
    <img class="bg" src="/wrapped/2026/art/${ART_SET}/bg-${card.no}.png" alt="">
  </picture>
  <div class="scrim"></div>

  <div class="layer">
    <p class="eyebrow">bagcheck &middot; <span data-token="YEAR">{{YEAR}}</span></p>
    <p class="hero" data-kind="${heroKind}" data-token="${card.hero}">{{${card.hero}}}</p>
    <h1 class="title">${esc(card.title)}</h1>
${facts ? `
    <div class="support">
${facts}
    </div>
` : ""}
    <p class="caption" data-caption="">{{CAPTION}}</p>
  </div>

  <span class="mark"><i class="markDot"></i>bagcheck</span>
  <span class="provenance">Read-only via SnapTrade</span>
</div>
</body>
</html>
`;
}

await mkdir(fileURLToPath(OUT), { recursive: true });

for (const card of CARDS) {
  const file = new URL(`card-${card.no}.html`, OUT);
  await writeFile(fileURLToPath(file), template(card));
  console.log(
    `card-${card.no}.html  ${card.key.padEnd(14)} ${card.tokens.length} token${card.tokens.length === 1 ? "" : "s"}`,
  );
}

console.log(`\n${CARDS.length} templates written to wrapped/templates/`);
