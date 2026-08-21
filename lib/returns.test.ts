import assert from "node:assert/strict";
import test from "node:test";
import { inYear, investmentFlows, periodReturn, raceField, ytdReturn } from "./returns";

const curve = (...pairs: Array<[string, number]>) =>
  pairs.map(([date, value]) => ({ date, value }));

test("a curve with no flows is end over start", () => {
  const r = periodReturn(curve(["2026-01-02", 1000], ["2026-06-30", 1200]));
  assert.ok(r != null);
  assert.ok(Math.abs(r - 0.2) < 1e-9);
});

test("buying into the book does not read as a gain", () => {
  /*
   * The whole reason this file exists. $1,000 of positions on day one, another
   * $1,000 bought halfway, closing at $2,000 — nothing was earned, and
   * end-over-start would have called it +100%.
   */
  const r = periodReturn(curve(["2026-01-01", 1000], ["2026-12-31", 2000]), [
    { date: "2026-07-02", amount: 1000 },
  ]);
  assert.ok(r != null);
  assert.ok(Math.abs(r) < 0.001, `expected about zero, got ${r}`);
});

test("selling out of the book does not read as a loss", () => {
  const r = periodReturn(curve(["2026-01-01", 2000], ["2026-12-31", 1000]), [
    { date: "2026-07-02", amount: -1000 },
  ]);
  assert.ok(r != null);
  assert.ok(Math.abs(r) < 0.001, `expected about zero, got ${r}`);
});

test("cash that never reaches the book leaves the return alone", () => {
  /*
   * The curve is positions only. A deposit that sits in cash moves neither the
   * curve nor the flows, so the figure is the zero it should be — which is the
   * case that made netting deposits out of this curve report a 40% loss.
   */
  const r = periodReturn(curve(["2026-01-01", 100_000], ["2026-12-31", 100_000]), []);
  assert.ok(r != null);
  assert.equal(r, 0);
});

test("a flow is weighted by how long the money was working", () => {
  /* Money in on the last day did no work, so the base is the opening value. */
  const late = periodReturn(curve(["2026-01-01", 1000], ["2026-12-31", 2100]), [
    { date: "2026-12-31", amount: 1000 },
  ]);
  const early = periodReturn(curve(["2026-01-01", 1000], ["2026-12-31", 2100]), [
    { date: "2026-01-02", amount: 1000 },
  ]);
  assert.ok(late != null && early != null);
  assert.ok(Math.abs(late - 0.1) < 1e-6, `late flow should barely dilute: ${late}`);
  assert.ok(early < late, "money that worked all year should dilute the return more");
});

test("a flow on a forward-filled opening mark counts at full weight", () => {
  /*
   * The second of January on any account with prior history is December's
   * snapshot, filled forward. It cannot contain a purchase made that day, so
   * dropping the flow would report the purchase as a +50% year.
   */
  const r = periodReturn(
    [
      { date: "2026-01-01", value: 100_000, interpolated: true },
      { date: "2026-12-31", value: 150_000, interpolated: false },
    ],
    [{ date: "2026-01-01", amount: 50_000 }],
  );
  assert.ok(r != null);
  assert.ok(Math.abs(r) < 1e-9, `expected zero, got ${r}`);
});

test("a flow on a real opening snapshot is already inside it", () => {
  const r = periodReturn(
    [
      { date: "2026-03-01", value: 1500, interpolated: false },
      { date: "2026-12-31", value: 1650, interpolated: false },
    ],
    [
      { date: "2026-02-01", amount: 1000 },
      { date: "2026-03-01", amount: 500 },
    ],
  );
  assert.ok(r != null);
  assert.ok(Math.abs(r - 0.1) < 1e-9, `expected +10%, got ${r}`);
});

test("nothing to measure returns null rather than a figure", () => {
  assert.equal(periodReturn([]), null);
  assert.equal(periodReturn(curve(["2026-01-01", 1000])), null);
  assert.equal(periodReturn(curve(["2026-06-01", 1000], ["2026-01-01", 900])), null);
});

test("a book built from nothing has earned nothing, not everything", () => {
  const r = periodReturn(curve(["2026-01-01", 0], ["2026-12-31", 5000]), [
    { date: "2026-03-01", amount: 5000 },
  ]);
  assert.ok(r != null);
  assert.ok(Math.abs(r) < 1e-9, `expected zero, got ${r}`);
});

test("a base of nothing at all has no honest percentage", () => {
  /* Bought on the closing day: the money had no time, so nothing divides. */
  assert.equal(
    periodReturn(curve(["2026-01-01", 0], ["2026-12-31", 5000]), [
      { date: "2026-12-31", amount: 5000 },
    ]),
    null,
  );
});

test("direction comes from the word, never from the sign", () => {
  const flows = investmentFlows([
    { date: "2026-02-01", type: "BUY", amount: 500 },
    { date: "2026-03-01", type: "Sell", amount: 300 },
    { date: "2026-03-02", type: "SELL", amount: -300 },
    { date: "2026-04-01", type: "buy", amount: -100 },
  ]);
  assert.deepEqual(flows, [
    { date: "2026-02-01", amount: 500 },
    { date: "2026-03-01", amount: -300 },
    { date: "2026-03-02", amount: -300 },
    { date: "2026-04-01", amount: 100 },
  ]);
});

test("a dividend is not a flow, and neither is a deposit", () => {
  /*
   * Neither touches the book: a dividend paid in cash leaves it unchanged, and
   * so does a contribution nobody has invested yet.
   */
  assert.deepEqual(
    investmentFlows([
      { date: "2026-02-01", type: "DIVIDEND", amount: 40 },
      { date: "2026-02-02", type: "CONTRIBUTION", amount: 5000 },
      { date: "2026-02-03", type: "WITHDRAWAL", amount: 900 },
    ]),
    [],
  );
});

test("a year is the slice inside it, oldest first", () => {
  const points = inYear(
    curve(["2026-05-01", 3], ["2025-12-31", 1], ["2026-01-02", 2], ["2027-01-01", 4]),
    2026,
  );
  assert.deepEqual(points.map((p) => p.date), ["2026-01-02", "2026-05-01"]);
});

test("year to date reads only the year", () => {
  const r = ytdReturn(
    curve(["2025-06-01", 100], ["2026-01-02", 1000], ["2026-08-01", 1100]),
    [{ date: "2025-07-01", amount: 900 }],
    2026,
  );
  assert.ok(r != null);
  assert.ok(Math.abs(r - 0.1) < 1e-9, `expected +10%, got ${r}`);
});

const peer = (key: string, value: number): import("./returns").RaceEntry => ({
  key,
  label: key,
  note: "",
  value,
});

test("the field is ordered from the front and the reader is placed in it", () => {
  const field = raceField({ value: 0.12 }, [peer("A", 0.2), peer("B", 0.05), peer("C", -0.03)]);
  assert.ok(field);
  assert.deepEqual(field.rows.map((r) => r.key), ["A", "you", "B", "C"]);
  assert.equal(field.place, 2);
  assert.equal(field.of, 4);
  assert.ok(field.behind != null && Math.abs(field.behind - 0.08) < 1e-9);
  /* The row the gap is quoted against is the one immediately above. */
  assert.equal(field.rows[field.place - 2].key, "A");
});

test("a reader in front is behind nobody", () => {
  const field = raceField({ value: 0.4 }, [peer("A", 0.2), peer("B", 0.05)]);
  assert.ok(field);
  assert.equal(field.place, 1);
  assert.equal(field.behind, null);
});

test("a reader with no figure still gets a field, unplaced", () => {
  const field = raceField(null, [peer("A", 0.2), peer("B", 0.05)]);
  assert.ok(field);
  assert.equal(field.place, null);
  assert.equal(field.behind, null);
  assert.ok(!field.rows.some((r) => r.you));
});

test("a field of one is not a race", () => {
  assert.equal(raceField({ value: 0.1 }, []), null);
  assert.equal(raceField(null, [peer("A", 0.2)]), null);
});

test("a peer the provider would not quote is dropped, never drawn at zero", () => {
  const field = raceField({ value: 0.1 }, [peer("A", 0.2), peer("B", Number.NaN), peer("C", 0.02)]);
  assert.ok(field);
  assert.deepEqual(field.rows.map((r) => r.key), ["A", "you", "C"]);
});

test("a part-year reader is drawn, and their row says which window it covers", () => {
  /*
   * The reader used to be removed from the field whenever their ledger started
   * after January — which on a new account is every account, all year. They are
   * drawn now, and the mismatch is stated on the row rather than hidden by
   * deleting it.
   */
  const field = raceField({ value: 0.12, since: "2026-05-03" }, [peer("A", 0.2), peer("B", 0.05)]);
  assert.ok(field);
  const you = field.rows.find((r) => r.you);
  assert.ok(you, "the reader is in their own field");
  assert.match(you.note, /3 May/);
  assert.equal(field.place, 2);
});

test("a full-year reader's row makes no claim about a window", () => {
  const field = raceField({ value: 0.12, since: null }, [peer("A", 0.2), peer("B", 0.05)]);
  const you = field?.rows.find((r) => r.you);
  assert.equal(you?.note, "Your own book.");
});
