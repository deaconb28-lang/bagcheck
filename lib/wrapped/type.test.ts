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
