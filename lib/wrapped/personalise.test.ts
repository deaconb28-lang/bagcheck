import assert from "node:assert/strict";
import test from "node:test";
import {
  captionIsClean,
  captionOf,
  fallbackCaption,
  fill,
  fitHero,
  normalise,
  tokenValues,
  validate,
} from "./personalise";
import type { WrappedStats } from "./stats";

/*
 * The model is allowed to be wrong. What it is not allowed to do is be wrong
 * on a screen — so these assert the gate, not the model.
 */

const TEMPLATE = `<div class="card" data-card="05">
  <p class="eyebrow">canopy &middot; <span data-token="YEAR">{{YEAR}}</span></p>
  <p class="hero" data-kind="figure" data-token="BEST_RETURN_PCT">{{BEST_RETURN_PCT}}</p>
  <h1 class="title">Best performer</h1>
  <span class="factValue" data-kind="word" data-token="BEST_TICKER">{{BEST_TICKER}}</span>
  <p class="caption" data-caption="">{{CAPTION}}</p>
</div>`;

const STATS = {
  YEAR: "2026",
  BEST_RETURN_PCT: "+42.8%",
  BEST_TICKER: "NVDA",
} as unknown as WrappedStats;

const CAPTION = "Your strongest name of the year.";

test("deterministic fill leaves no braces and sets every value", () => {
  const out = fill(TEMPLATE, STATS, CAPTION);
  assert.ok(!out.includes("{{"));
  assert.equal(validate(out, TEMPLATE, STATS).ok, true);
  assert.equal(captionOf(out), CAPTION);
});

test("fill throws rather than shipping an unfilled token", () => {
  assert.throws(
    () => fill(TEMPLATE, { YEAR: "2026" } as unknown as WrappedStats, CAPTION),
    /no value for \{\{BEST_RETURN_PCT\}\}/,
  );
});

test("a value that arrives with markup in it is escaped, not interpreted", () => {
  const out = fill(
    TEMPLATE,
    { ...STATS, BEST_TICKER: "<script>x</script>" } as unknown as WrappedStats,
    CAPTION,
  );
  assert.ok(!out.includes("<script>"));
  assert.ok(out.includes("&lt;script&gt;"));
});

/* ── Check 1 ── */
test("a leftover token is a hard failure", () => {
  const bad = fill(TEMPLATE, STATS, CAPTION).replace("+42.8%", "{{BEST_RETURN_PCT}}");
  const v = validate(bad, TEMPLATE, STATS);
  assert.equal(v.ok, false);
  assert.equal(v.ok === false && v.check, "tokens-remain");
});

/* ── Check 2: the one that matters most ── */
test("a number the model reformatted is a hard failure", () => {
  const bad = fill(TEMPLATE, STATS, CAPTION).replace("+42.8%", "+42.8 %");
  const v = validate(bad, TEMPLATE, STATS);
  assert.equal(v.ok, false);
  assert.equal(v.ok === false && v.check, "value-mismatch");
});

test("a number the model rounded differently is a hard failure", () => {
  const bad = fill(TEMPLATE, STATS, CAPTION).replace("+42.8%", "+43%");
  assert.equal(validate(bad, TEMPLATE, STATS).ok, false);
});

test("a number the model simply invented is a hard failure", () => {
  const bad = fill(TEMPLATE, STATS, CAPTION).replace("NVDA", "TSLA");
  const v = validate(bad, TEMPLATE, STATS);
  assert.equal(v.ok, false);
  assert.equal(v.ok === false && v.check, "value-mismatch");
});

/* ── Check 3 ── */
test("an element the model added is a hard failure", () => {
  const bad = fill(TEMPLATE, STATS, CAPTION).replace(
    "</div>",
    '<p class="extra">Nice work</p></div>',
  );
  const v = validate(bad, TEMPLATE, STATS);
  assert.equal(v.ok, false);
  assert.equal(v.ok === false && v.check, "markup-changed");
});

test("an element the model deleted is a hard failure", () => {
  const bad = fill(TEMPLATE, STATS, CAPTION).replace(
    /<span class="factValue"[\s\S]*?<\/span>/,
    "",
  );
  const v = validate(bad, TEMPLATE, STATS);
  assert.equal(v.ok, false);
  assert.equal(v.ok === false && v.check, "markup-changed");
});

test("a style the model altered is a hard failure", () => {
  const bad = fill(TEMPLATE, STATS, CAPTION).replace('class="hero"', 'class="hero" style="color:red"');
  assert.equal(validate(bad, TEMPLATE, STATS).ok, false);
});

test("the caption is the one thing the model may change", () => {
  const a = fill(TEMPLATE, STATS, "One caption.");
  const b = fill(TEMPLATE, STATS, "A completely different caption.");
  assert.equal(normalise(a), normalise(b));
  assert.equal(validate(b, TEMPLATE, STATS).ok, true);
});

test("whitespace the model reflowed is not a failure", () => {
  const out = fill(TEMPLATE, STATS, CAPTION).replace(/\n\s+/g, "\n");
  assert.equal(validate(out, TEMPLATE, STATS).ok, true);
});

/* ── Token reading ── */
test("every data-token element is read, including the one in the eyebrow", () => {
  const out = fill(TEMPLATE, STATS, CAPTION);
  assert.deepEqual(
    tokenValues(out).map((t) => `${t.token}=${t.text}`),
    ["YEAR=2026", "BEST_RETURN_PCT=+42.8%", "BEST_TICKER=NVDA"],
  );
});

/* ── The caption bank ── */
test("the fallback caption is stable for a reader and a card", () => {
  const bank = ["one", "two", "three"];
  assert.equal(fallbackCaption(bank, "user:05"), fallbackCaption(bank, "user:05"));
  assert.ok(bank.includes(fallbackCaption(bank, "user:05")));
});

test("different cards draw different lines from the same bank", () => {
  const bank = ["one", "two", "three"];
  const picks = new Set(
    ["01", "02", "03", "04", "05", "06"].map((n) => fallbackCaption(bank, `user:${n}`)),
  );
  assert.ok(picks.size > 1, "a bank of three should not collapse to one line");
});

/* ── Tone, enforced rather than hoped for ── */
test("a caption that advises is rejected", () => {
  for (const c of [
    "You should hold longer next time.",
    "Consider spreading your buys out.",
    "Try to avoid selling into weakness.",
  ]) {
    assert.equal(captionIsClean(c).ok, false, c);
  }
});

test("a caption that scolds is rejected", () => {
  for (const c of [
    "You traded too often this year.",
    "Unfortunately this was a costly mistake.",
    "You could have held for more.",
  ]) {
    assert.equal(captionIsClean(c).ok, false, c);
  }
});

test("a caption that predicts is rejected", () => {
  assert.equal(captionIsClean("Next year you will do even better.").ok, false);
  assert.equal(captionIsClean("This name is poised to run.").ok, false);
});

test("trader slang is rejected", () => {
  for (const c of ["Diamond hands all year.", "Straight to the moon.", "You aped in early."]) {
    assert.equal(captionIsClean(c).ok, false, c);
  }
});

test("an exclamation mark is rejected", () => {
  assert.equal(captionIsClean("What a year!").ok, false);
});

test("a caption over twelve words is rejected", () => {
  assert.equal(
    captionIsClean("One two three four five six seven eight nine ten eleven twelve thirteen").ok,
    false,
  );
});

test("the written fallbacks all pass their own rules", async () => {
  const { CARDS } = (await import("../../wrapped/cards.mjs")) as {
    CARDS: Array<{ no: string; fallbackCaptions: string[] }>;
  };
  for (const card of CARDS) {
    assert.equal(card.fallbackCaptions.length, 3, `card ${card.no} needs three fallbacks`);
    for (const c of card.fallbackCaptions) {
      const v = captionIsClean(c);
      assert.equal(v.ok, true, `card ${card.no}: ${c} — ${v.ok === false ? v.reason : ""}`);
    }
  }
});

test("a warm, neutral caption passes", () => {
  for (const c of [
    "Your strongest name of the year.",
    "You held this one longer than anything else.",
    "Here is where you landed next to the benchmark.",
  ]) {
    assert.equal(captionIsClean(c).ok, true, c);
  }
});

/*
 * The hero fit. A viewport clamp cannot know how many characters a figure has,
 * so `+42.8%` and `129` were set at the same 380px and the six-character one
 * ran off the edge of the card — on every reader whose return had a sign and a
 * decimal, which is most of them.
 */

test("a wide figure is stepped down to fit the measure", () => {
  const out = fitHero(fill(TEMPLATE, STATS, CAPTION));
  const size = /--hero-size:(\d+)px/.exec(out);
  assert.ok(size, "a six-character hero should carry a size");
  assert.ok(Number(size[1]) < 380);
  /* And it actually fits: characters x advance x size, inside the measure. */
  assert.ok("+42.8%".length * 0.555 * Number(size[1]) <= 880);
});

test("a narrow figure keeps the full size and takes no stamp", () => {
  const stats = { ...STATS, BEST_RETURN_PCT: "+5%" } as unknown as WrappedStats;
  assert.ok(!fitHero(fill(TEMPLATE, stats, CAPTION)).includes("--hero-size"));
});

test("a word hero is left alone — it is allowed to wrap", () => {
  const template = TEMPLATE.replace(
    '<p class="hero" data-kind="figure"',
    '<p class="hero" data-kind="word"',
  );
  const stats = { ...STATS, BEST_RETURN_PCT: "Consumer Staples" } as unknown as WrappedStats;
  assert.ok(!fitHero(fill(template, stats, CAPTION)).includes("--hero-size"));
});

test("the fit changes no value and no other markup", () => {
  const filled = fill(TEMPLATE, STATS, CAPTION);
  const fitted = fitHero(filled);
  assert.deepEqual(tokenValues(fitted), tokenValues(filled));
  assert.equal(captionOf(fitted), CAPTION);
  /* The stored card is what passed the gate; the fit happens on the way out. */
  assert.equal(validate(filled, TEMPLATE, STATS).ok, true);
});
