import type { ConnectionAccount, HoldingRow } from "@/lib/db";
import type { Contributor, RoundTrip, ScoreComponents, ScoredDay, Streak } from "@/lib/score";
import type { Archetype } from "@/lib/archetypes";
import type { HeatDay } from "@/components/idioms";
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
  /**
   * Every scored day the screen read, newest first.
   *
   * The nightly score was already being fetched — 400 documents, on every
   * view — and then reduced to two things: how many there were, and the
   * newest one's four components. Everything the score can say about a
   * *history* was thrown away one line after it arrived: the streak, the
   * personal best, the year of days. This carries it the rest of the way at
   * no extra I/O.
   */
  scored: ScoredDay[];
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
  /** Uninvested cash, or null unless every account reported a balance. */
  cash: number | null;
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
   * Uninvested cash and what share of the account it is, 0–1.
   *
   * Null when the brokerage will not report a balance — which is a fact about
   * the connection, not a zero. Money sitting in cash is the one part of an
   * account that is definitely not invested, and the dashboard had no way to
   * say so.
   */
  cash: number | null;
  cashShare: number | null;
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

/**
 * What the instrument concluded, as one object.
 *
 * `null` when nothing has been scored, and that is the whole contract: an
 * account with holdings but no scored day yet falls straight through to the
 * dashboard, and `archetypeFor` never returns null — hand it nothing and it
 * confidently answers "The Improviser". A character with a name, drawn beside
 * someone's own ledger, is the single loudest claim this product makes about
 * a person; it does not get to be a default.
 */
export interface Read {
  score: number;
  /** Against the oldest of the last seven scored days. Null under two. */
  delta: number | null;
  components: ScoreComponents;
  archetype: Archetype;
  /** Top movers behind today's number, already ranked. */
  contributors: Contributor[];
  /** Only runs that are live today. Empty below their own floors. */
  streaks: Streak[];
  /**
   * Where today sits in the reader's **own** distribution — never a cohort.
   * Null under five scored days. Any surface drawing it says whose
   * distribution it is, in words.
   */
  percentile: number | null;
  /** The best score on file, and the day it happened. */
  best: { score: number; date: string } | null;
  /** The last 26 weeks as cells, banded by the same thresholds as everything else. */
  heat: HeatDay[];
  scoredDays: number;
}

export interface DashboardView {
  window: Window;
  /** Absent until the first nightly score lands. */
  read: Read | null;
  book: Book;
  performance: Performance;
  /** Absent unless the field can be quoted on the same terms. */
  field: RaceField | null;
  /**
   * Why the field is absent, when it is.
   *
   * The block used to vanish with nothing said, which is indistinguishable
   * from a bug: a reader who has been told the dashboard compares them to a
   * field of funds, and sees no field, has no way to learn whether it is
   * broken, unbuilt, or simply refusing to make a claim it cannot support.
   * The refusals stay — none of these is a reason to draw a fund at zero —
   * but they are now stated.
   */
  fieldAbsence: "market-key" | "too-few-funds" | "year-too-short" | null;
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
   * The running total of realised P&L, and the year as calendar cells.
   *
   * Both empty below `MIN_SESSIONS`. `dailyPnl` is sparse — only days that
   * closed something appear — so an account that has never sold produces a
   * cumulative line of one point and a calendar of 365 empty cells. Drawing
   * either would be the empty-rectangle failure this screen was rebuilt to
   * remove, wearing a new shape.
   */
  cumulative: Array<{ date: string; total: number }>;
  calendar: HeatDay[];
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
  wrapped: {
    year: number;
    earned: number;
    total: number;
    archetype: string | null;
    /**
     * Which frames were minted, by their number.
     *
     * The deck was already being fetched and reduced to a count — the frame
     * numbers came back in the same object and were dropped one line later.
     * The collection block reads them to say which twelve are which, at zero
     * extra I/O.
     */
    earnedNos: string[];
  };
  provenance: Provenance;
  accounts: number;
  syncedAt: string | null;
}
