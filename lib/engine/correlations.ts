import type { RoundTrip, TxnLite } from "@/lib/score";

/**
 * Layer 4 — the engine. Pure functions over the ledger that surface the
 * patterns a P&L statement hides.
 *
 * Every finding here is descriptive: it names what happened, never what to
 * do about it. A finding that cannot clear its own sample floor returns null
 * rather than a number nobody should act on.
 */

export interface Finding {
  /** Stable id, so a screen can key and order them. */
  key: string;
  /** The mono category tag. */
  tag: string;
  /** One plain sentence. States the pattern; prescribes nothing. */
  sentence: string;
  /** Mono evidence line — the counts the sentence rests on. */
  evidence: string;
  /** Which axis this belongs to, for colour. */
  tone: "moss" | "signal" | "clay";
  /**
   * Realised P&L of the pattern's bucket, in dollars — what the habit
   * actually made or cost, straight off the round trips. Null where no
   * honest dollar exists (a ratio has no bucket). This is what lets a
   * screen answer "so what is this worth" without inventing a projection.
   */
  impact: number | null;
}

/** Below this a "pattern" is noise, and printing it would be a lie. */
export const MIN_SAMPLE = 8;

const hourOf = (iso: string | null): number | null => {
  if (!iso || iso.length <= 10) return null; // date-only: no clock to read
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.getUTCHours();
};

const dayOf = (iso: string | null): string | null => iso?.slice(0, 10) ?? null;

const isBuy = (t: TxnLite) => (t.type ?? "").toLowerCase().includes("buy");
const isSell = (t: TxnLite) => (t.type ?? "").toLowerCase().includes("sell");

const pct = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(n).toFixed(1)}%`;

/**
 * Hold times are fractional days. Rounding a 0.4-day average to "0d" next to
 * a sentence claiming an 11x gap makes the evidence contradict the claim, so
 * short averages keep a decimal.
 */
const days = (n: number) => (n < 10 ? n.toFixed(1) : n.toFixed(0));

/**
 * Return on positions opened late in the session against those opened early.
 * Needs timestamps — many brokerages report date only, in which case this
 * stays silent rather than guessing.
 */
export function entryHour(trips: RoundTrip[], txns: TxnLite[]): Finding | null {
  const openHour = new Map<string, number>();
  for (const t of txns) {
    if (!isBuy(t)) continue;
    const h = hourOf(t.date);
    const d = dayOf(t.date);
    if (h == null || !d || !t.symbol) continue;
    openHour.set(`${t.symbol}|${d}`, h);
  }
  if (!openHour.size) return null;

  const late: number[] = [];
  const early: number[] = [];
  let latePnl = 0;
  for (const trip of trips) {
    const h = openHour.get(`${trip.symbol}|${trip.openDate}`);
    if (h == null || !trip.notional) continue;
    const ret = (trip.pnl / trip.notional) * 100;
    if (h >= 18) {
      late.push(ret); // 18:00 UTC ≈ 2pm ET
      latePnl += trip.pnl;
    } else {
      early.push(ret);
    }
  }
  if (late.length < MIN_SAMPLE || early.length < MIN_SAMPLE) return null;

  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const lateMean = mean(late);
  const earlyMean = mean(early);
  if (lateMean >= earlyMean) return null;

  return {
    key: "entry-hour",
    tag: "Entries by hour",
    sentence:
      lateMean < 0
        ? "Your average return is negative on positions opened after 2pm."
        : "Positions you open after 2pm return less than the ones you open earlier.",
    evidence: `${late.length} late · ${pct(lateMean)} avg · ${early.length} early · ${pct(earlyMean)} avg`,
    tone: lateMean < 0 ? "clay" : "signal",
    impact: latePnl,
  };
}

/** Win rate on busy sessions against quiet ones. */
export function sessionSize(trips: RoundTrip[], txns: TxnLite[]): Finding | null {
  const perDay = new Map<string, number>();
  for (const t of txns) {
    if (!isBuy(t) && !isSell(t)) continue;
    const d = dayOf(t.date);
    if (!d) continue;
    perDay.set(d, (perDay.get(d) ?? 0) + 1);
  }
  if (!perDay.size) return null;

  let busyWins = 0, busy = 0, quietWins = 0, quiet = 0, busyPnl = 0;
  for (const trip of trips) {
    const n = perDay.get(trip.openDate) ?? 0;
    if (!n) continue;
    if (n >= 6) {
      busy += 1;
      busyPnl += trip.pnl;
      if (trip.pnl > 0) busyWins += 1;
    } else {
      quiet += 1;
      if (trip.pnl > 0) quietWins += 1;
    }
  }
  if (busy < MIN_SAMPLE || quiet < MIN_SAMPLE) return null;

  const busyRate = (busyWins / busy) * 100;
  const quietRate = (quietWins / quiet) * 100;
  const drop = quietRate - busyRate;
  if (drop <= 5) return null;

  return {
    key: "session-size",
    tag: "Session size",
    sentence: `Your win rate falls ${drop.toFixed(0)} points on sessions with six or more trades.`,
    evidence: `${busy} trades on busy days · ${busyRate.toFixed(0)}% · ${quiet} on quiet days · ${quietRate.toFixed(0)}%`,
    tone: "signal",
    impact: busyPnl,
  };
}

/** How much faster winners get closed than losers. */
export function exitSpeed(trips: RoundTrip[]): Finding | null {
  const winners = trips.filter((t) => t.pnl > 0);
  const losers = trips.filter((t) => t.pnl < 0);
  if (winners.length < MIN_SAMPLE || losers.length < MIN_SAMPLE) return null;

  const avg = (xs: RoundTrip[]) => xs.reduce((s, t) => s + t.holdDays, 0) / xs.length;
  const w = avg(winners);
  const l = avg(losers);

  /*
   * Hold time is measured in days, so both sides need at least half a day of
   * average hold before a ratio between them means anything. Without this an
   * all-intraday ledger reports "11x longer" off two averages that both round
   * to zero — arithmetically true, and noise.
   */
  if (w < 0.5 || l < 0.5) return null;

  // Either direction is a finding — holding winners longer is the good one.
  const holdsWinners = w > l;
  const ratio = holdsWinners ? w / l : l / w;
  if (ratio < 1.4) return null;

  return {
    key: "exit-speed",
    tag: "Exit speed",
    sentence: holdsWinners
      ? `You hold winners ${ratio.toFixed(1)}× longer than losers.`
      : `You sell winners ${ratio.toFixed(1)}× faster than losers.`,
    evidence: `${winners.length} winners · ${days(w)}d avg · ${losers.length} losers · ${days(l)}d avg`,
    tone: holdsWinners ? "moss" : "clay",
    impact: null, // a ratio has no bucket of realised dollars to sum
  };
}

/** Re-entering the same name within days of closing it at a loss. */
export function reEntry(trips: RoundTrip[]): Finding | null {
  const byClose = [...trips].sort((a, b) => a.closeDate.localeCompare(b.closeDate));
  let quick = 0;
  let losses = 0;
  let quickPnl = 0;
  for (const trip of byClose) {
    if (trip.pnl >= 0) continue;
    losses += 1;
    const next = byClose.find(
      (t) => t.symbol === trip.symbol && t.openDate > trip.closeDate,
    );
    if (!next) continue;
    const gap =
      (Date.parse(`${next.openDate}T00:00:00Z`) -
        Date.parse(`${trip.closeDate}T00:00:00Z`)) /
      86_400_000;
    if (gap >= 0 && gap <= 3) {
      quick += 1;
      quickPnl += next.pnl; // what the hurried second try actually returned
    }
  }
  if (losses < MIN_SAMPLE || quick < 3) return null;

  const rate = (quick / losses) * 100;
  return {
    key: "re-entry",
    tag: "Re-entry",
    sentence: `You were back in the same name within three days on ${rate.toFixed(0)}% of your losing exits.`,
    evidence: `${quick} of ${losses} losing exits`,
    tone: "signal",
    impact: quickPnl,
  };
}

/** Every finding the ledger currently supports, strongest signal first. */
export function findings(trips: RoundTrip[], txns: TxnLite[]): Finding[] {
  return [
    exitSpeed(trips),
    entryHour(trips, txns),
    sessionSize(trips, txns),
    reEntry(trips),
  ].filter((f): f is Finding => f !== null);
}

/**
 * What the engine still needs before it can speak. The empty state names the
 * next move rather than saying there is nothing here.
 */
export function whatIsMissing(trips: RoundTrip[], txns: TxnLite[]): string {
  if (trips.length < MIN_SAMPLE) {
    return `Patterns need at least ${MIN_SAMPLE} closed positions to separate a habit from a coincidence. Your ledger holds ${trips.length}.`;
  }
  const timestamped = txns.some((t) => hourOf(t.date) != null);
  if (!timestamped) {
    return "Your brokerage reports trade dates without a clock, so time-of-day patterns stay closed. The rest fill in as more positions close.";
  }
  return "Nothing has separated from noise yet. These fill in as more positions close.";
}
