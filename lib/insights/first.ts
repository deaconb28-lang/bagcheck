import type { HoldingRow } from "@/lib/db/queries";
import type { TxnLite } from "@/lib/score/types";
import { classify } from "@/lib/score/util";

/**
 * ── What a brokerage tells you the minute it connects ──
 *
 * The insights page waited ten market days before it said anything at all, on
 * the reasoning that a pattern read off a few days is a coincidence with a
 * headline. That reasoning is right about *patterns* and wrong about the
 * screen: a positions snapshot is a complete, present-tense fact the moment it
 * arrives, and how concentrated somebody is, how much of the account is
 * sitting in cash and how long they have been holding are all readable on day
 * one without predicting anything.
 *
 * So the wait applies only to the readings that genuinely need a history. What
 * a first sync can support is here, and every one of these is a **description
 * of the book as it stands** rather than an inference about behaviour:
 *
 *   · nothing here uses P&L, because two weeks of P&L is noise
 *   · nothing here compares the reader to anybody
 *   · every one has a floor, and returns null under it rather than reporting
 *     a coincidence — the same rule the engine's own findings follow
 *
 * Pure, so it is testable and so the page can compute it from the screen it
 * has already loaded.
 */

export interface FirstRead {
  key: string;
  /** The kind of measurement, as an eyebrow says it. Never the finding. */
  kind: string;
  /** The finding, stated. */
  headline: string;
  /** One sentence of evidence. Never a recommendation. */
  body: string;
  /** The figure, already formatted. Null where the read is not a number. */
  figure: string | null;
  /** How the figure reads: a concentration is not money. */
  tone: "signal" | "moss" | "loss" | "accent";
}

export interface FirstInput {
  holdings: HoldingRow[];
  transactions: TxnLite[];
  /**
   * The book by industry, already aggregated by the view — name and share of
   * the whole account. Empty without a market key, which is what keeps the
   * industry read absent rather than inferred.
   */
  sectors: Array<{ name: string; share: number }>;
  /** How much of the book the broker's own classification covers, 0–1. */
  sectorCover: number | null;
  /** Uninvested cash as a share of the account. Null when unreported. */
  cashShare: number | null;
  /** Today, so "held since" is measured against something explicit. */
  today: string;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

/** Days between two ISO days, floored at zero. */
function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${to.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export function firstReads(input: FirstInput): FirstRead[] {
  const out: FirstRead[] = [];
  const priced = input.holdings.filter((h) => (h.value ?? 0) > 0);
  const total = priced.reduce((sum, h) => sum + (h.value ?? 0), 0);
  const ranked = [...priced].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  /*
   * ── Concentration ──
   *
   * Under three names there is no concentration to report: two positions are
   * concentrated by definition and saying so tells the reader nothing they did
   * not do on purpose.
   */
  if (ranked.length >= 3 && total > 0) {
    const topTwo = (ranked[0].value ?? 0) + (ranked[1].value ?? 0);
    const share = topTwo / total;
    out.push({
      key: "concentration",
      kind: "Concentration",
      headline: `${ranked[0].symbol} and ${ranked[1].symbol} are ${pct(share)} of the book`,
      body: `Your two largest positions out of ${ranked.length}. Weight only — this says nothing about whether they are up.`,
      figure: pct(share),
      tone: "signal",
    });
  }

  /*
   * ── Sector tilt ──
   *
   * Absent without a market key, because an inferred sector is a lookup table
   * pretending to be a fact about the reader's book.
   */
  const covered = input.sectorCover ?? 0;
  const topSector = [...input.sectors].sort((a, b) => b.share - a.share)[0];
  /* Half the book has to be classified before a tilt means anything. */
  if (ranked.length >= 3 && topSector && covered >= 0.5) {
    out.push({
      key: "sector",
      kind: "Industry mix",
      headline: `${pct(topSector.share)} of the book is ${topSector.name}`,
      body: `Across ${input.sectors.length} ${input.sectors.length === 1 ? "industry" : "industries"} your broker priced. ${pct(covered)} of the account is classified.`,
      figure: pct(topSector.share),
      tone: "signal",
    });
  }

  /*
   * ── Cash ──
   *
   * The one part of an account that is definitely not invested. Absent rather
   * than zero when the brokerage will not report a balance: that is a fact
   * about the connection rather than a holding of nothing.
   */
  if (input.cashShare != null && input.cashShare >= 0.02) {
    out.push({
      key: "cash",
      kind: "Uninvested",
      headline: `${pct(input.cashShare)} of the account is sitting in cash`,
      body: "Straight off the balance your brokerage reports, not inferred from the positions.",
      figure: pct(input.cashShare),
      tone: input.cashShare >= 0.25 ? "loss" : "signal",
    });
  }

  /*
   * ── The longest open hold ──
   *
   * Off the first buy still on file for a name the account still holds. It is
   * a fact about the ledger's own span as much as about patience, so the
   * sentence says which.
   */
  const held = new Set(priced.map((h) => h.symbol));
  const opens = new Map<string, string>();
  for (const t of input.transactions) {
    if (!t.date || !t.symbol || classify(t.type) !== "buy") continue;
    if (!held.has(t.symbol)) continue;
    const day = t.date.slice(0, 10);
    const first = opens.get(t.symbol);
    if (!first || day < first) opens.set(t.symbol, day);
  }
  const longest = [...opens.entries()]
    .map(([symbol, day]) => ({ symbol, day, days: daysBetween(day, input.today) }))
    .sort((a, b) => b.days - a.days)[0];
  if (longest && longest.days >= 30) {
    out.push({
      key: "longest-hold",
      kind: "Longest hold",
      headline: `You have held ${longest.symbol} for ${longest.days.toLocaleString("en-US")} days`,
      body: "Measured from the first buy your brokerage still has on file, so it is a floor rather than an exact date.",
      figure: `${longest.days.toLocaleString("en-US")}d`,
      tone: "accent",
    });
  }

  /*
   * ── Buying cadence ──
   *
   * Counts, never P&L. Six buys is the floor: five gaps is the fewest that can
   * describe a rhythm rather than a coincidence.
   */
  const buys = input.transactions
    .filter((t) => t.date && classify(t.type) === "buy")
    .map((t) => t.date!.slice(0, 10))
    .sort();
  if (buys.length >= 6) {
    const span = daysBetween(buys[0], buys[buys.length - 1]);
    const every = span / (buys.length - 1);
    out.push({
      key: "cadence",
      kind: "Buying cadence",
      headline:
        every <= 1.5
          ? `${buys.length} buys, most of them on the same days`
          : `A buy about every ${Math.round(every)} days`,
      body: `${buys.length.toLocaleString("en-US")} buys across ${span.toLocaleString("en-US")} days of ledger. A count, not a judgement.`,
      figure: every <= 1.5 ? `${buys.length}` : `${Math.round(every)}d`,
      tone: "accent",
    });
  }

  /*
   * ── Which day you buy on ──
   *
   * Entry counts by weekday. This is the honest half of the weekday pattern:
   * *when* you act needs only a calendar, where *how it went* needs a history
   * long enough for the P&L to mean something.
   */
  if (buys.length >= 10) {
    const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const byDay = new Array<number>(7).fill(0);
    for (const day of buys) {
      const at = new Date(`${day}T00:00:00Z`);
      if (!Number.isNaN(at.getTime())) byDay[at.getUTCDay()] += 1;
    }
    const top = byDay.indexOf(Math.max(...byDay));
    const share = byDay[top] / buys.length;
    /* A flat week is not a tilt. A third of entries on one day is. */
    if (share >= 0.33) {
      out.push({
        key: "entry-day",
        kind: "Entry timing",
        headline: `${pct(share)} of your buys land on a ${names[top]}`,
        body: `${byDay[top]} of ${buys.length} entries. When you act, not how it went — that one needs a longer history.`,
        figure: names[top].slice(0, 3),
        tone: "accent",
      });
    }
  }

  return out;
}
