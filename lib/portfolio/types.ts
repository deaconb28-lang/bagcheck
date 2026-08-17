import type { ConnectionAccount, HoldingRow } from "@/lib/db";
import type { RoundTrip } from "@/lib/score";
import type { RaceField } from "@/lib/returns";

/**
 * ── The contract between the ledger and the visuals ──
 *
 * Four stages, and each one only knows the stage below it:
 *
 *   SnapTrade  →  **ledger**   raw fills and position snapshots, append-only
 *              →  **facts**    materialised once per sync, keyed by ledgerHash
 *              →  **view**     screen-shaped, pure, computed per request
 *              →  **visuals**  components that take a view and draw it
 *
 * The middle two are the point. Before this, every page called `loadScreen`
 * — 400 scores, 20 snapshots, a tier lookup and two counts — and then
 * recomputed weekday P&L, hold splits, sessions and Sharpe inline, three
 * pages doing overlapping work against the same ledger. Worse, each page
 * decided for itself what a figure *meant*, which is how one screen ended up
 * calling gross proceeds "realised P&L" while another called FIFO gain the
 * same thing.
 *
 * So: **`facts` is the only thing stored, `view` is the only thing a page
 * reads, and a component never sees a ledger row.** A visual takes a typed
 * view and draws it. If a number is wrong there is one file to open.
 *
 * Everything nullable is nullable on purpose. `null` means the ledger cannot
 * answer, and the rule downstream is always the same: the block is absent
 * rather than estimated.
 */

/** A point on a value curve. `filled` marks a day no sync reported. */
export interface Mark {
  date: string;
  value: number;
  filled: boolean;
  /** Whether this mark is the whole account or only the invested book. */
  withCash: boolean;
}

/** A session that closed something, and what it made. */
export interface Session {
  date: string;
  amount: number;
}

/** How a figure was arrived at. Rendered in mono, never invented. */
export interface Provenance {
  /** "Brokerage synced 2026-08-16 · 5 marks refreshed from market data" */
  marks: string;
  /** The newest position snapshot the numbers stand on. */
  asOf: string | null;
}

export type RangeKey = "45d" | "ytd" | "all";

export interface Window {
  key: RangeKey;
  /** "45D" — what a chip and a chart eyebrow call it. */
  label: string;
  /** Inclusive ISO day the window opens on. */
  from: string;
  /**
   * Whether the window opens early enough in January to be quoted beside a
   * fund's year to date. A six-month figure at a twelve-month scale is two
   * measurements rather than a comparison.
   */
  comparable: boolean;
}

/* ── Facts: what one sync leaves behind, plus what a request adds ───────── */

export interface Facts {
  /** Every FIFO-matched close. The spine of every realised figure. */
  trips: RoundTrip[];
  /** Realised P&L per session — matched gain plus cash dividends. */
  sessions: Session[];
  /** Daily portfolio value, forward-filled. */
  curve: Mark[];
  /**
   * The two kinds of flow, because which one a return has to net out depends
   * on what the curve is measuring.
   *
   * On a **book** curve — positions only — the thing that moves it other than
   * the market is money crossing into a position, so `trades` is what comes
   * out. On an **account** curve, a buy is an internal transfer that moves
   * nothing and `transfers` is what comes out. Netting the wrong one reports a
   * deposit left in cash as a total loss, which is exactly the bug that made
   * this distinction worth a type.
   */
  flows: { trades: Array<{ date: string; amount: number }>; transfers: Array<{ date: string; amount: number }> };
  holdTime: {
    winnersMean: number | null;
    losersMean: number | null;
    winners: number;
    losers: number;
  };
  findings: Array<{
    key: string;
    tag: string;
    sentence: string;
    evidence: string;
    impact: number | null;
  }>;
  /** Positions as the brokerage last reported them, marks refreshed. */
  holdings: HoldingRow[];
  accounts: ConnectionAccount[];
  syncedAt: string | null;
  provenance: Provenance;
  /** Names whose FIFO units disagree with the snapshot — never in statistics. */
  excluded: string[];
  transactionCount: number;
  scoredDays: number;
  investorAge: number | null;
  components: Record<string, number> | null;
}

/* ── Views: exactly what each screen draws ──────────────────────────────── */

export interface Book {
  positions: number;
  value: number;
  cost: number;
  /** Unrealised, in dollars and as a percentage of cost. */
  unrealised: number;
  unrealisedPct: number | null;
  winners: number;
  /**
   * Positions whose unrealised P&L is knowable at all.
   *
   * "5 of 8 in profit" is a lie when two of the eight report no cost basis and
   * no broker P&L — they are not losers, they are unanswered. The denominator
   * is what we can actually read.
   */
  priced: number;
  largest: string | null;
  /** The share the two biggest names carry, 0–1. */
  topTwo: number;
}

export interface Performance {
  /**
   * What the return is a return *on*. "account" includes uninvested cash;
   * "book" is the invested slice, which is all a brokerage that will not
   * report a balance can honestly answer for. The screen states it.
   */
  basis: "account" | "book";
  /** Return over the window, flows removed. Null until two marks exist. */
  ret: number | null;
  /** The same move in dollars. */
  gain: number | null;
  sessions: Session[];
  up: number;
  down: number;
  realised: number;
  /** The largest absolute session in the window — what columns scale against. */
  peak: number;
  winRate: { wins: number; trades: number; pct: number | null };
  sharpe: number | null;
  /** Six dates spread across the window, already formatted. */
  axis: string[];
}

export interface Pattern {
  key: string;
  kind: "weekday" | "holds" | "finding" | "profile";
  title: string;
  body: string;
  /** Realised dollars the pattern is worth. Null where no honest bucket is. */
  impact: number | null;
  /** Whether it reads as a leak or an edge. */
  tone: "loss" | "moss";
  /** The window it was measured over, as a chip says it. */
  range: string;
  /** Whatever the visual needs to draw it, already shaped. */
  chart:
    | { type: "weekday"; cells: Array<{ day: string; amount: number }>; worst: string }
    | { type: "holds"; winners: number; losers: number }
    | { type: "profile"; archetype: string; components: Record<string, number>; age: number | null }
    | { type: "figure" };
}

export interface DashboardView {
  window: Window;
  book: Book;
  performance: Performance;
  /** Absent unless the field can be quoted on the same terms. */
  field: RaceField | null;
  /** SPY's own year, for the return card's comparison line. */
  index: number | null;
  allocation: Array<{ key: string; label: string; value: number }>;
  /**
   * The book, position by position, with what each is up or down.
   *
   * The dashboard's largest panel is the daily realised chart, and an account
   * that has never closed a position renders it as an empty rectangle half the
   * height of the screen. This is what that space holds instead: unrealised
   * P&L needs no round trips, no equity history and no derivation — one synced
   * snapshot answers it.
   */
  positions: Array<{ symbol: string; value: number; pnl: number | null; pnlPct: number | null }>;
  concentration: string | null;
  /**
   * Where the money sits by *industry*, largest first.
   *
   * The ring answers "which names" and this answers "which kind of thing" —
   * the same question at the grain that actually carries risk. Five positions
   * spread evenly is not spread at all if four of them are semiconductors.
   *
   * Empty when the brokerage and the provider between them cannot say. A
   * sector inferred from a ticker is a lookup table pretending to be a fact
   * about the reader's book, so unknown holdings are excluded from the total
   * rather than bucketed into "Other".
   */
  sectors: Array<{ name: string; value: number; share: number }>;
  /** How much of the book the sectors above could actually account for, 0–1. */
  sectorsCover: number;
  patterns: Pattern[];
  wrapped: { year: number; earned: number; total: number; archetype: string | null };
  provenance: Provenance;
  accounts: number;
  syncedAt: string | null;
}
