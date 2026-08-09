import type { RoundTrip } from "@/lib/score";
import { KIND_FLOOR } from "@/lib/tags";
import type { Conviction, WhyKey } from "@/lib/tags";
import { MIN_SAMPLE } from "./correlations";
import type { Finding } from "./correlations";

/*
 * The tag-joined half of the engine — the part a brokerage cannot supply.
 * Every function here takes the join already made: an opened position with
 * the reason and conviction the user gave at entry. Reason-level findings
 * honour the product's stated floor — a kind starts speaking at KIND_FLOOR
 * tags on file — and every bucket still needs MIN_SAMPLE closed positions
 * before a mean is worth printing.
 */

/** A tagged entry joined to the position it opened. */
export interface TaggedOpen {
  symbol: string;
  /** The open date, YYYY-MM-DD — the same key round trips carry. */
  date: string;
  why: WhyKey;
  conviction: Conviction;
}

interface JoinedTrip {
  trip: RoundTrip;
  why: WhyKey;
  conviction: Conviction;
}

const pct = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}%`;
const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
const ret = (t: RoundTrip) => (t.pnl / t.notional) * 100;

/** Join closed positions to the tags that opened them, by symbol and day. */
export function joinTags(trips: RoundTrip[], opens: TaggedOpen[]): JoinedTrip[] {
  const byKey = new Map<string, TaggedOpen>();
  for (const open of opens) byKey.set(`${open.symbol}|${open.date}`, open);
  const joined: JoinedTrip[] = [];
  for (const trip of trips) {
    const open = byKey.get(`${trip.symbol}|${trip.openDate}`);
    if (open && trip.notional) joined.push({ trip, why: open.why, conviction: open.conviction });
  }
  return joined;
}

/**
 * High-conviction entries against low-conviction ones. Conviction is not a
 * "kind", so this clears on closed samples alone — no KIND_FLOOR.
 */
export function byConviction(trips: RoundTrip[], opens: TaggedOpen[]): Finding | null {
  const joined = joinTags(trips, opens);
  const highTrips = joined.filter((j) => j.conviction >= 4);
  const lowTrips = joined.filter((j) => j.conviction <= 2);
  const high = highTrips.map((j) => ret(j.trip));
  const low = lowTrips.map((j) => ret(j.trip));
  if (high.length < MIN_SAMPLE || low.length < MIN_SAMPLE) return null;
  const lowPnl = lowTrips.reduce((s, j) => s + j.trip.pnl, 0);

  const h = mean(high);
  const l = mean(low);
  const evidence = `${high.length} high · ${pct(h)} avg · ${low.length} low · ${pct(l)} avg`;

  // The clean multiple only exists when both sides made money.
  if (h > 0 && l > 0.2 && h / l >= 1.5) {
    return {
      key: "conviction",
      tag: "Conviction",
      sentence: `Your high-conviction entries returned ${(h / l).toFixed(1)}× your low-conviction entries.`,
      evidence,
      tone: "moss",
      impact: null, // both sides made money; there is no cost bucket to sum
    };
  }
  if (h - l >= 2.5) {
    return {
      key: "conviction",
      tag: "Conviction",
      sentence: `High-conviction entries returned ${pct(h)} on average; low-conviction ${pct(l)}.`,
      evidence,
      tone: "moss",
      impact: lowPnl < 0 ? lowPnl : null,
    };
  }
  if (l - h >= 2.5) {
    return {
      key: "conviction",
      tag: "Conviction",
      sentence: "Your low-conviction entries have outperformed your high-conviction ones.",
      evidence,
      tone: h < 0 ? "clay" : "signal",
      impact: h < 0 ? highTrips.reduce((s, j) => s + j.trip.pnl, 0) : null,
    };
  }
  return null;
}

/**
 * The best-reading reason against the worst. Both kinds need KIND_FLOOR tags
 * on file — the floor the tag prompt promises — and MIN_SAMPLE closed
 * positions behind their mean.
 */
export function byReason(
  trips: RoundTrip[],
  opens: TaggedOpen[],
  kindCounts: Partial<Record<WhyKey, number>>,
): Finding | null {
  const joined = joinTags(trips, opens);
  const byWhy = new Map<WhyKey, number[]>();
  for (const j of joined) {
    const xs = byWhy.get(j.why) ?? [];
    xs.push(ret(j.trip));
    byWhy.set(j.why, xs);
  }

  const pnlByWhy = new Map<WhyKey, number>();
  for (const j of joined) pnlByWhy.set(j.why, (pnlByWhy.get(j.why) ?? 0) + j.trip.pnl);
  const eligible = [...byWhy.entries()]
    .filter(([why, xs]) => (kindCounts[why] ?? 0) >= KIND_FLOOR && xs.length >= MIN_SAMPLE)
    .map(([why, xs]) => ({ why, mean: mean(xs), n: xs.length }))
    .sort((a, b) => b.mean - a.mean);
  if (eligible.length < 2) return null;

  const best = eligible[0];
  const worst = eligible[eligible.length - 1];
  if (best.mean - worst.mean < 2.5) return null;

  return {
    key: "reason",
    tag: "Reason at entry",
    sentence: `Entries tagged "${best.why}" returned ${pct(best.mean)} on average; "${worst.why}" returned ${pct(worst.mean)}.`,
    evidence: `${best.n} ${best.why} · ${worst.n} ${worst.why}`,
    tone: worst.mean < 0 ? "clay" : "signal",
    impact: (pnlByWhy.get(worst.why) ?? 0) < 0 ? pnlByWhy.get(worst.why)! : null,
  };
}

/**
 * Revenge gets named on its own when it clears the same floors — it is the
 * reason the taxonomy exists, and folding it into best-versus-worst hides it
 * whenever some other kind reads worse.
 */
export function revenge(
  trips: RoundTrip[],
  opens: TaggedOpen[],
  kindCounts: Partial<Record<WhyKey, number>>,
): Finding | null {
  if ((kindCounts.revenge ?? 0) < KIND_FLOOR) return null;
  const joined = joinTags(trips, opens).filter((j) => j.why === "revenge");
  if (joined.length < MIN_SAMPLE) return null;

  const m = mean(joined.map((j) => ret(j.trip)));
  if (m >= 0) return null; // revenge that worked is not a pattern worth naming

  return {
    key: "revenge",
    tag: "Revenge entries",
    sentence: `Entries tagged revenge returned ${pct(m)} on average.`,
    evidence: `${joined.length} closed revenge entries`,
    tone: "clay",
    impact: joined.reduce((s, j) => s + j.trip.pnl, 0),
  };
}

/** Every tag-joined finding the ledger currently supports. */
export function taggedFindings(
  trips: RoundTrip[],
  opens: TaggedOpen[],
  kindCounts: Partial<Record<WhyKey, number>>,
): Finding[] {
  return [
    byConviction(trips, opens),
    revenge(trips, opens, kindCounts),
    byReason(trips, opens, kindCounts),
  ].filter((f): f is Finding => f !== null);
}

/**
 * Where the tag data stands, for the rail. Null once reasons are speaking —
 * the rail then has nothing to add.
 */
export function whatTagsAreMissing(
  opens: TaggedOpen[],
  kindCounts: Partial<Record<WhyKey, number>>,
): string | null {
  const total = Object.values(kindCounts).reduce((s, n) => s + (n ?? 0), 0);
  if (total === 0) {
    return "No entry carries a reason yet. Reasons are the half of a pattern the brokerage cannot supply.";
  }
  const speaking = Object.values(kindCounts).some((n) => (n ?? 0) >= KIND_FLOOR);
  if (!speaking) {
    return `${total} ${total === 1 ? "reason is" : "reasons are"} on file. A kind starts speaking at ${KIND_FLOOR} of it.`;
  }
  return null;
}
