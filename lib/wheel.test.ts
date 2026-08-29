import assert from "node:assert/strict";
import test from "node:test";
import {
  BOX,
  K_MAX,
  K_MIN,
  describe as describeWheel,
  fmtPct,
  foldDust,
  gainRamp,
  layout,
  radii,
  arcRoom,
  radiusFor,
  rankRoom,
  ringValues,
  solveScale,
  validate,
  type WheelPosition,
} from "./wheel";

/* The book from the specification's worked example. */
const BOOK: WheelPosition[] = [
  { ticker: "SPAXX", weight: 21.92, ret: 0.0, isCash: true },
  { ticker: "POV", weight: 17.0, ret: 16.21 },
  { ticker: "KMHN", weight: 15.43, ret: 10.93 },
  { ticker: "GEV", weight: 14.31, ret: -9.86 },
  { ticker: "FSPGX", weight: 12.53, ret: 9.38 },
  { ticker: "FCNTX", weight: 9.62, ret: 8.04 },
  { ticker: "GEHC", weight: 5.59, ret: 7.76 },
  { ticker: "OWFS", weight: 3.6, ret: 40.03 },
];

const BENCH = { label: "S&P 500", ret: 12.3 };

test("the angles sum to a full circle before gaps are applied", () => {
  const { positions, total } = validate(BOOK);
  const wedges = layout(positions, total);
  const swept = wedges.reduce((sum, w) => sum + w.span, 0);
  assert.ok(Math.abs(swept - 360) < 0.01, `swept ${swept}`);
});

test("the sweep starts at twelve o'clock and runs clockwise", () => {
  const { positions, total } = validate(BOOK);
  const wedges = layout(positions, total);
  assert.ok(wedges[0].a0 >= -90 && wedges[0].a0 < -89);
  for (let i = 1; i < wedges.length; i++) {
    assert.ok(wedges[i].a0 > wedges[i - 1].a1, "wedges must not overlap");
  }
});

test("no wedge is drawn thinner than the minimum span", () => {
  const slivers: WheelPosition[] = [
    { ticker: "BIG", weight: 99.4, ret: 5 },
    { ticker: "TINY", weight: 0.3, ret: 2 },
    { ticker: "TINIER", weight: 0.3, ret: -1 },
  ];
  const { positions, total } = validate(slivers);
  for (const w of layout(positions, total)) {
    assert.ok(w.a1 - w.a0 >= BOX.minSpan - 1e-9, `${w.ticker} spans ${w.a1 - w.a0}`);
  }
});

test("a single position takes the whole annulus with no seam", () => {
  const wedges = layout([{ ticker: "ONE", weight: 100, ret: 4 }], 100);
  assert.equal(wedges[0].a1 - wedges[0].a0, 360);
});

test("the worked example's scale matches the specification", () => {
  const { positions } = validate(BOOK);
  const scale = solveScale(
    positions.map((p) => p.ret),
    BENCH.ret,
  );
  /*
   * Derived from the box rather than hard-coded: the specification's own
   * 2.548 was computed against its constants, and this build draws the ring
   * larger. What the test is actually for is that the *binding* end is the
   * one with less room, which is the part that would break silently.
   */
  const kOut = (BOX.rMax - BOX.r0) / 40.03;
  const kIn = (BOX.r0 - BOX.rMin) / 9.86;
  assert.ok(Math.abs(scale.k - Math.min(kOut, kIn)) < 0.001, `k was ${scale.k}`);
  assert.ok(kOut < kIn, "the outward side should bind on this book");
  assert.equal(scale.truncated, false);
});

test("one modest outlier does not earn the jagged edge", () => {
  /* 40.03 against a ceiling of 37.5 trips the ratio by a hair. Truncating
     there would cost a drawn discontinuity to reclaim 7% of the radius. */
  const { positions } = validate(BOOK);
  const scale = solveScale(positions.map((p) => p.ret), BENCH.ret);
  assert.equal(scale.truncated, false);
});

test("a genuine outlier is truncated and says so", () => {
  const wild: WheelPosition[] = [
    { ticker: "MOON", weight: 10, ret: 400 },
    { ticker: "A", weight: 30, ret: 5 },
    { ticker: "B", weight: 30, ret: 12 },
    { ticker: "C", weight: 30, ret: -4 },
  ];
  const { positions } = validate(wild);
  const scale = solveScale(positions.map((p) => p.ret), null);
  assert.equal(scale.truncated, true);
  assert.ok(scale.ceil < scale.vMax);
});

test("nothing escapes the canvas — every position and both reference rings", () => {
  const { positions } = validate(BOOK);
  const scale = solveScale(positions.map((p) => p.ret), BENCH.ret);
  for (const p of positions) {
    const [ri, ro] = radii(p.ret, scale);
    assert.ok(ri >= BOX.rMin - 1e-9, `${p.ticker} inner ${ri}`);
    assert.ok(ro <= BOX.rMax + 1e-9, `${p.ticker} outer ${ro}`);
  }
  for (const v of [5.87, BENCH.ret]) {
    const r = radiusFor(v, scale);
    assert.ok(r >= BOX.rMin && r <= BOX.rMax, `ring at ${v} → ${r}`);
  }
});

test("a flat position renders as a visible band rather than a hairline", () => {
  const scale = solveScale([0, 5, -3], null);
  const [ri, ro] = radii(0, scale);
  assert.ok(ro - ri >= 2, `band was ${ro - ri}px`);
});

test("k is clamped at both ends", () => {
  const flat = solveScale([0.01, 0.02, -0.01], null);
  assert.equal(flat.k, K_MAX);
  assert.equal(flat.magnified, true);

  const enormous = solveScale([5000, -5000], null);
  assert.ok(enormous.k >= K_MIN);
});

test("a total loss is clamped for drawing and flagged, never silently moved", () => {
  const { positions, warnings } = validate([
    { ticker: "ZERO", weight: 50, ret: -100 },
    { ticker: "OK", weight: 50, ret: 5 },
  ]);
  assert.equal(positions[0].ret, -99.9);
  assert.ok(warnings.some((w) => w.kind === "clamped"));
});

test("closed lots are filtered and a bad total is reported", () => {
  const { positions, warnings } = validate([
    { ticker: "GONE", weight: 0, ret: 12 },
    { ticker: "A", weight: 40, ret: 1 },
    { ticker: "B", weight: 40, ret: 1 },
  ]);
  assert.equal(positions.length, 2);
  assert.ok(warnings.some((w) => w.kind === "weights"));
});

test("a book outside two to fourteen positions is not renderable", () => {
  assert.equal(validate([{ ticker: "A", weight: 100, ret: 1 }]).renderable, false);
  const many = Array.from({ length: 15 }, (_, i) => ({
    ticker: `T${i}`,
    weight: 100 / 15,
    ret: i,
  }));
  assert.equal(validate(many).renderable, false);
});

test("the ring steps are nice numbers and always include the datum", () => {
  const scale = solveScale([-9.86, 40.03, 16.21], 12.3);
  const rings = ringValues(scale);
  assert.ok(rings.includes(0), "zero is the datum and is always drawn");
  assert.deepEqual(rings, [-10, 0, 10, 20, 30, 40]);
  assert.ok(rings.length >= 4 && rings.length <= 7);
});

test("a signed percentage uses a real minus sign", () => {
  assert.equal(fmtPct(16.21), "+16.21%");
  assert.equal(fmtPct(-9.86), "−9.86%");
  assert.equal(fmtPct(0), "0.00%");
});

test("the description is generated and counts what the chart argues", () => {
  const { positions } = validate(BOOK);
  const desc = describeWheel(positions, BENCH);
  /* POV and OWFS clear the benchmark; GEV falls inside break-even. */
  assert.match(desc, /POV and OWFS/);
  assert.match(desc, /One position, GEV, falls inside break-even/);
  assert.match(desc, /8 positions/);
});

test("the description states an absence rather than omitting it", () => {
  const flat: WheelPosition[] = [
    { ticker: "A", weight: 50, ret: 2 },
    { ticker: "B", weight: 50, ret: 3 },
  ];
  const desc = describeWheel(flat, { label: "S&P 500", ret: 12.3 });
  assert.match(desc, /No position reaches past/);
  assert.match(desc, /No position falls inside break-even/);
});

test("truncation actually buys the bulk its resolution back", () => {
  /* The failure this guards: a contaminated percentile puts the ceiling just
     under the outlier, so the bulk stays crushed and the jagged edge is paid
     for nothing. */
  const wild: WheelPosition[] = [
    { ticker: "MOON", weight: 10, ret: 400 },
    { ticker: "A", weight: 30, ret: 5 },
    { ticker: "B", weight: 30, ret: 12 },
    { ticker: "C", weight: 30, ret: -4 },
  ];
  const { positions } = validate(wild);
  const scale = solveScale(positions.map((p) => p.ret), null);
  assert.equal(scale.ceil, 12, "the ceiling is the largest non-outlier");
  /* B now reaches the outer edge instead of sitting 3px off break-even. */
  assert.ok(radiusFor(12, scale) >= BOX.rMax - 1e-9);
});

test("truncation never cuts the benchmark ring off", () => {
  /* The ceiling is the largest non-outlier, which is right for positions and
     wrong for the reference ring: clamped to the outer edge it lands on top
     of whatever wedge is also at the edge, and the one reading the dashed
     rings give — does this cross the line — stops having an answer. */
  const wild: WheelPosition[] = [
    { ticker: "MOON", weight: 10, ret: 400 },
    { ticker: "A", weight: 30, ret: 5 },
    { ticker: "B", weight: 30, ret: 12 },
    { ticker: "C", weight: 30, ret: -4 },
  ];
  const { positions } = validate(wild);
  const scale = solveScale(positions.map((p) => p.ret), 12.3);
  assert.equal(scale.truncated, true);
  assert.ok(scale.ceil >= 12.3, `ceiling ${scale.ceil} cuts off a 12.3% benchmark`);
  /* The benchmark sits strictly outside a position it actually beat. */
  assert.ok(radiusFor(12.3, scale) > radiusFor(12, scale));
});

test("the ramp uses all four steps rather than crowding the bottom", () => {
  /* The failure this replaced: banded off the ceiling, a book with one
     runaway winner put three of six gainers in step one and nothing in
     step three. */
  const step = gainRamp([0, 16.21, 10.93, -9.86, 9.38, 8.04, 7.76, 40.03]);
  const used = new Set([16.21, 10.93, 9.38, 8.04, 7.76, 40.03].map(step));
  assert.equal(used.size, 4, `only used steps ${[...used].join(", ")}`);
});

test("the ramp never runs backwards", () => {
  const step = gainRamp([1, 5, 9, 30]);
  let last = 0;
  for (const v of [1, 5, 9, 30]) {
    const band = step(v);
    assert.ok(band >= last, `${v}% stepped down to ${band}`);
    last = band;
  }
});

test("equal returns take equal shades", () => {
  const step = gainRamp([4, 4, 9, 20]);
  assert.equal(step(4), step(4));
  assert.ok(step(4) < step(20));
});

test("a loss and cash take no step of the gain ramp", () => {
  const step = gainRamp([-9, 5, 12]);
  assert.equal(step(-9), 1);
  assert.equal(step(0), 1);
});

test("a single winner is not ranked against itself", () => {
  const step = gainRamp([-4, 6]);
  assert.equal(step(6), 4);
});

test("dust is folded into one wedge with a value-weighted return", () => {
  /* Four positions at a tenth of a percent were four wedges at the minimum
     span with four labels stacked into a pile at the top of the chart. */
  const book: WheelPosition[] = [
    { ticker: "SPAXX", weight: 35.5, ret: 0 },
    { ticker: "PGY", weight: 22.1, ret: 44.33 },
    { ticker: "GEV", weight: 21.3, ret: -13.99 },
    { ticker: "KRMN", weight: 20.4, ret: 8.1 },
    { ticker: "XOM", weight: 0.2, ret: 45.68 },
    { ticker: "FSPGX", weight: 0.2, ret: 35.54 },
    { ticker: "OMFS", weight: 0.15, ret: 27.08 },
    { ticker: "FCAEX", weight: 0.15, ret: 44.13 },
  ];
  const { positions, folded } = foldDust(book);
  assert.equal(folded, 4);
  const rest = positions.find((p) => p.isRest);
  assert.ok(rest, "the remainder is drawn");
  assert.ok(Math.abs(rest.weight - 0.7) < 1e-9);
  /* Weighted by value, not a mean of percentages. */
  const expected = (45.68 * 0.2 + 35.54 * 0.2 + 27.08 * 0.15 + 44.13 * 0.15) / 0.7;
  assert.ok(Math.abs(rest.ret - expected) < 1e-9, `${rest.ret} vs ${expected}`);
});

test("a remainder of one name is promoted back out", () => {
  const { positions, folded } = foldDust([
    { ticker: "BIG", weight: 99, ret: 4 },
    { ticker: "DUST", weight: 1, ret: 20 },
  ]);
  assert.equal(folded, 0);
  assert.ok(!positions.some((p) => p.isRest));
  assert.ok(positions.some((p) => p.ticker === "DUST"));
});

test("a ring whose radius would be clamped is dropped, not drawn in the wrong place", () => {
  /* The reader's own book: -13.99% worst, +45.68% best. k is set by the
     winner, so -20% maps below rMin and was drawn at the -17% radius while
     still labelled -20% — a gridline in the wrong place with a figure on it. */
  const scale = solveScale([-13.99, 45.68, 44.33, 8.1, 0], 12.29);
  for (const v of ringValues(scale)) {
    const r = BOX.r0 + v * scale.k;
    assert.ok(r >= BOX.rMin - 1e-9 && r <= BOX.rMax + 1e-9, `${v}% lands at ${r}`);
  }
  assert.ok(ringValues(scale).includes(0), "the datum is always drawn");
});

test("a ring a little past the worst loser survives when the winner sets the scale", () => {
  /* Dropping every ring outside the value domain is too blunt: -10% on a book
     whose worst is -9.86% lands at radius 124.5, nowhere near clamped. */
  const scale = solveScale([-9.86, 40.03, 16.21], 12.3);
  assert.ok(ringValues(scale).includes(-10));
});

test("both halves of a lopsided book get gridlines", () => {
  /* -13.99% to +45.68% picks a step of 20 by raw span, whose only negative
     ring is off the canvas — so the losing half had nothing to read against. */
  const scale = solveScale([-13.99, 45.68, 44.33, 8.1, 0], 12.29);
  const rings = ringValues(scale);
  assert.ok(rings.some((v) => v < 0), `no negative ring in ${rings.join(", ")}`);
  assert.ok(rings.some((v) => v > 0));
  assert.ok(rings.length >= 4 && rings.length <= 8, `${rings.length} rings`);
});

test("gridlines are never drawn closer than their own labels", () => {
  /* A book running -16% to +16% has its scale set by the inward side, which
     is only 38px deep — a step of 5 put seven rings 11px apart and they read
     as a grey smear beside the centre. */
  const scale = solveScale([-16.03, 16.03, 9.53, 3.51, -0.91], 11.7);
  const rings = ringValues(scale);
  for (let i = 1; i < rings.length; i++) {
    const gap = Math.abs((rings[i] - rings[i - 1]) * scale.k);
    assert.ok(gap >= 20 - 1e-9, `${rings[i - 1]}% to ${rings[i]}% is ${gap.toFixed(1)}px`);
  }
  assert.ok(rings.includes(0));
});

test("a rank numeral is only drawn where its own wedge has the arc for it", () => {
  /*
   * The floor is silence, the same rule the heatmap runs on: a wedge too thin
   * for a legible numeral keeps its colour, its angle and its row in the key.
   */
  const wide = { a0: 0, a1: 40 };
  const sliver = { a0: 0, a1: 1.2 };
  assert.ok(arcRoom(wide, BOX.rRank) >= rankRoom(1));
  assert.ok(arcRoom(sliver, BOX.rRank) < rankRoom(1));

  /*
   * And a two-digit numeral needs more room than a one-digit one, or "12"
   * gets drawn on a wedge with space for one character and its second glyph
   * runs across the gap onto the neighbour — a label on the wrong position.
   */
  assert.ok(rankRoom(2) > rankRoom(1));
  const tight = { a0: 0, a1: 6 };
  assert.ok(arcRoom(tight, BOX.rRank) >= rankRoom(1));
  assert.ok(arcRoom(tight, BOX.rRank) < rankRoom(2));
});
