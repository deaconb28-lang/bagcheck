import assert from "node:assert/strict";
import test from "node:test";
import {
  BOX,
  K_MAX,
  K_MIN,
  declutter,
  describe as describeWheel,
  fmtPct,
  gainRamp,
  layout,
  radii,
  radiusFor,
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
  /* kOut = (252-150)/40.03 = 2.548 ; kIn = (150-112)/9.86 = 3.854 */
  assert.ok(Math.abs(scale.k - 2.548) < 0.01, `k was ${scale.k}`);
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
  const rings = ringValues(-9.86, 40.03);
  assert.ok(rings.includes(0), "zero is the datum and is always drawn");
  assert.deepEqual(rings, [-10, 0, 10, 20, 30, 40]);
  assert.ok(rings.length >= 4 && rings.length <= 7);
});

test("declutter separates a column and keeps it on the canvas", () => {
  const tags = [0, 4, 8, 12].map((i) => ({
    ticker: `T${i}`,
    side: "right" as const,
    y: 300 + i,
    x: 400,
    mid: 0,
    outer: 200,
  }));
  const out = declutter(tags, 26, 640);
  const ys = out.map((t) => t.y).sort((a, b) => a - b);
  for (let i = 1; i < ys.length; i++) {
    assert.ok(ys[i] - ys[i - 1] >= 26 - 1e-9, `gap ${ys[i] - ys[i - 1]}`);
  }
  assert.ok(ys[0] >= 18 && ys[ys.length - 1] <= 622);
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
