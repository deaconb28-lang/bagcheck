import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CARDS, TYPE_AXES } from "../../wrapped/cards.mjs";
import { HERO_METRICS } from "../../wrapped/metrics.mjs";

/*
 * The type direction, which exists for the same reason the art directions do.
 * Twelve grounds under twelve identical lockups is a deck of one poster in
 * twelve wallpapers — the face, the placement and the order have to move too,
 * or the variation stops at the background.
 */

const css = readFileSync(join(process.cwd(), "wrapped/templates/card.css"), "utf8");
const template = (no: string) =>
  readFileSync(join(process.cwd(), `wrapped/templates/card-${no}.html`), "utf8");

test("every card declares a type direction from the closed vocabulary", () => {
  assert.equal(CARDS.length, 12);
  for (const card of CARDS) {
    for (const axis of ["face", "place", "align", "case", "order"] as const) {
      assert.ok(
        TYPE_AXES[axis].includes(card.type[axis]),
        `${card.no}: ${axis} "${card.type[axis]}" is not in the vocabulary`,
      );
    }
  }
});

test("no two cards set the same face in the same place on the same edge", () => {
  const seen = CARDS.map((c) => `${c.type.face}/${c.type.place}/${c.type.align}`);
  assert.equal(new Set(seen).size, 12, "two cards share a type direction");
});

test("the deck spends every voice and every placement it declares", () => {
  /*
   * A vocabulary with an unused word is a word nobody is maintaining against
   * the stylesheet — the same reason `components/idioms` is a closed set with
   * no idle members.
   */
  for (const axis of ["face", "place", "align", "order"] as const) {
    const used = new Set(CARDS.map((c) => c.type[axis]));
    for (const value of TYPE_AXES[axis]) {
      assert.ok(used.has(value), `no card uses ${axis} "${value}"`);
    }
  }
});

test("every face a card asks for has a rule and a measured advance", () => {
  for (const face of TYPE_AXES.face) {
    /* `machine` is the default, stated on `.card` rather than on an attribute. */
    if (face !== "machine") {
      assert.ok(
        css.includes(`.card[data-face="${face}"]`),
        `card.css has no rule for face "${face}"`,
      );
    }
    const metrics = HERO_METRICS[face];
    assert.ok(metrics, `no measured metrics for face "${face}"`);
    assert.ok(metrics.cap > 0 && metrics.widest > 0);
    for (const digit of "0123456789") {
      assert.ok(metrics.advance[digit] > 0, `face "${face}" has no advance for ${digit}`);
    }
  }
});

test("every place and order a card asks for has a rule", () => {
  for (const place of TYPE_AXES.place) {
    if (place === "foot") continue; /* The default, stated on `.layer`. */
    assert.ok(css.includes(`.card[data-place="${place}"]`), `no rule for place "${place}"`);
  }
  for (const order of TYPE_AXES.order) {
    if (order === "title-under") continue; /* The default: the markup's own order. */
    assert.ok(css.includes(`.card[data-order="${order}"]`), `no rule for order "${order}"`);
  }
});

test("the templates wear the direction their card declares", () => {
  for (const card of CARDS) {
    const html = template(card.no);
    for (const [axis, attr] of [
      ["face", "data-face"],
      ["place", "data-place"],
      ["align", "data-align"],
      ["case", "data-case"],
      ["order", "data-order"],
    ] as const) {
      assert.ok(
        html.includes(`${attr}="${card.type[axis]}"`),
        `card-${card.no}.html does not carry ${attr}="${card.type[axis]}"`,
      );
    }
  }
});

test("the eyebrow and the fact labels stay in the machine face on all twelve", () => {
  /*
   * The variation is the voice's, not the machine line's. Mono owns labels,
   * counts and timestamps in this product, and a deck whose *labels* also
   * moved would be chaos in the one layer that has to stay scannable — so no
   * face rule may reach them.
   */
  for (const selector of [".eyebrow", ".factLabel", ".factValue", ".provenance"]) {
    const block = new RegExp(`\\${selector}\\s*{([^}]*)}`).exec(css)?.[1];
    assert.ok(block, `no rule for ${selector}`);
    assert.match(block, /font-family:\s*"Machine"/, `${selector} is not set in Machine`);
  }
  assert.ok(
    !/\[data-face="[a-z]+"\][^{]*\.(eyebrow|factLabel|factValue)/.test(css),
    "a face rule reaches the machine line",
  );
});

/*
 * What a card says about its own figure.
 *
 * The deck's clarity problem was not the wording, it was that the biggest
 * number on a card had nothing naming it: card 07 set the *year's* trade count
 * under a heading that read "Most active month", so the figure read as the
 * month's and no line on the card said otherwise. The label names the metric;
 * the caption says what was counted and over what period.
 */

test("every card whose hero is a figure says what that figure measures", () => {
  const namesItself = new Set(["cover", "archetype"]);
  for (const card of CARDS) {
    if (namesItself.has(card.key)) {
      assert.equal(card.measures, null, `${card.no} should let its hero name itself`);
      continue;
    }
    assert.ok(card.measures, `${card.no} has no label above its hero`);
    assert.ok(
      template(card.no).includes(`<p class="heroLabel">${card.measures}</p>`),
      `card-${card.no}.html does not print its own hero label`,
    );
  }
});

test("no caption carries a figure of its own", () => {
  /*
   * Every number on a card is set in type from the stats and checked character
   * for character. A numeral inside a caption is the one figure on the card
   * nobody is comparing to anything.
   */
  for (const card of CARDS) {
    for (const caption of card.fallbackCaptions) {
      assert.ok(!/\d/.test(caption), `${card.no}: "${caption}" carries a numeral`);
    }
  }
});

test("no two cards share a caption", () => {
  const all = CARDS.flatMap((c) => c.fallbackCaptions);
  assert.equal(new Set(all).size, all.length, "a caption is reused across the deck");
});

test("a ticker is printed with a mark slot beside it, never inside it", () => {
  /*
   * Inside, the slot would become part of the ticker's own text — and
   * `tokenValues` compares that text to the stats character for character, so
   * every card carrying a mark would fail the gate.
   */
  const tickers = ["LONGEST_HOLD_TICKER", "BEST_TICKER"];
  for (const card of CARDS) {
    const html = template(card.no);
    for (const token of tickers) {
      const wanted = card.tokens.includes(token);
      assert.equal(
        html.includes(`data-logo="${token}"`),
        wanted,
        `card-${card.no}.html ${wanted ? "should" : "should not"} carry a mark for ${token}`,
      );
      if (!wanted) continue;
      assert.ok(
        !new RegExp(`data-token="${token}"[^>]*>[^<]*<img`).test(html),
        `card-${card.no}.html nests the mark inside the ticker`,
      );
      /* The template stores no address — `stampLogos` adds it at render. */
      assert.ok(
        !/<img[^>]*\bdata-logo=[^>]*\bsrc=/.test(html),
        `card-${card.no}.html stores a logo URL, which the gate would see as changed markup`,
      );
    }
  }
});

test("a card that carries no direction still draws the way it always did", () => {
  /*
   * Cards minted before this table exist in the store and are rendered from
   * what was stored. Every rule below cites a custom property, an unresolved
   * `var()` inside `font-family` invalidates the declaration outright rather
   * than falling through — so the defaults have to live on `.card` itself.
   */
  const base = /\.card\s*{([\s\S]*?)\n}/.exec(css)?.[1];
  assert.ok(base, "no base .card rule");
  for (const prop of [
    "--hero-face",
    "--hero-word-face",
    "--title-face",
    "--hero-weight",
    "--hero-track",
    "--hero-cap",
    "--title-weight",
    "--title-track",
    "--lockup-case",
    "--lockup-align",
    "--lockup-text",
  ]) {
    assert.ok(base.includes(`${prop}:`), `${prop} has no default on .card`);
  }
  assert.match(base, /--hero-face:\s*"Machine"/);
  assert.match(base, /--hero-word-face:\s*"Voice"/);
});
