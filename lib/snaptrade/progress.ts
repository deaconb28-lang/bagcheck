/**
 * The onboarding sync, described.
 *
 * Pure: everything here turns a stored progress document into the four rows
 * and one closing line the dialog renders. The sync itself writes the
 * document; nothing in this file touches the network or the database, so the
 * copy can be tested against numbers that never came from a brokerage.
 *
 * The rule the whole file exists to keep: **every figure shown is one the
 * sync actually counted.** A progress bar that moves on a timer is a lie
 * about someone's own history, and this is the first screen they ever see.
 */

export type SyncPhase = "accounts" | "positions" | "history" | "derive";
export type SyncStatus = "running" | "done" | "failed";

export interface SyncProgress {
  /** The phase the run reached — kept on failure, so the dialog can say where. */
  phase: SyncPhase;
  status: SyncStatus;
  error: string | null;
  accountsTotal: number;
  accountsDone: number;
  positions: number;
  transactions: number;
  /** Earliest trade date seen in the ledger, YYYY-MM-DD. */
  earliestDate: string | null;
  elapsedMs: number | null;
}

export type StepState = "waiting" | "running" | "done" | "failed";

export interface SyncStep {
  phase: SyncPhase;
  label: string;
  state: StepState;
  /** The count this step has reached, in mono. Empty until it has one. */
  detail: string;
  /** 0–1, for the meter. Never synthesised — a step with no denominator is 0 or 1. */
  fraction: number;
}

const ORDER: SyncPhase[] = ["accounts", "positions", "history", "derive"];

const LABEL: Record<SyncPhase, string> = {
  accounts: "Accounts",
  positions: "Positions",
  history: "History",
  derive: "Round trips and P&L",
};

const NUMBER = new Intl.NumberFormat("en-US");

/**
 * Where each of the four rows stands.
 *
 * Positions and history are per-account loops, so their meters read the
 * account cursor — the one denominator the sync knows before it finishes.
 * Accounts and the derivation have no denominator at all, so they are 0 or 1
 * rather than an invented curve.
 */
export function stepsFrom(progress: SyncProgress): SyncStep[] {
  const reached = Math.max(0, ORDER.indexOf(progress.phase));
  // A finished run is past the end; a failed one stops on the phase it reached.
  const cursor = progress.status === "done" ? ORDER.length : reached;

  return ORDER.map((phase, index) => {
    const state: StepState =
      index < cursor
        ? "done"
        : index === cursor
          ? progress.status === "failed"
            ? "failed"
            : "running"
          : "waiting";

    return {
      phase,
      label: LABEL[phase],
      state,
      detail: detailFor(phase, progress, state),
      fraction: fractionFor(phase, progress, state),
    };
  });
}

function detailFor(phase: SyncPhase, p: SyncProgress, state: StepState): string {
  if (state === "waiting") return "";
  switch (phase) {
    case "accounts":
      return p.accountsTotal ? `${p.accountsTotal} connected` : "";
    case "positions":
      return p.positions ? `${NUMBER.format(p.positions)} held` : "";
    case "history":
      return p.transactions ? `${NUMBER.format(p.transactions)} transactions` : "";
    case "derive":
      return state === "done" ? "ready" : "";
  }
}

function fractionFor(phase: SyncPhase, p: SyncProgress, state: StepState): number {
  if (state === "waiting" || state === "failed") return 0;
  if (state === "done") return 1;
  // Running: only the two per-account loops have a real denominator.
  if (phase === "positions" || phase === "history") {
    if (!p.accountsTotal) return 0;
    return Math.min(1, p.accountsDone / p.accountsTotal);
  }
  return 0;
}

const WORDS = [
  "zero", "one", "two", "three", "four", "five", "six",
  "seven", "eight", "nine", "ten", "eleven", "twelve",
];

/** Small counts read better as words; past twelve, digits. */
export function spell(n: number): string {
  return n >= 0 && n <= 12 ? WORDS[n] : NUMBER.format(n);
}

/**
 * How much history arrived, as a phrase: "Three years", "Fourteen months",
 * "Six weeks". Returns null when the ledger is empty or the dates are
 * unusable, and the caller drops the line rather than printing "zero days".
 */
export function spanLabel(earliest: string | null, today: string): string | null {
  if (!earliest) return null;
  const from = Date.parse(`${earliest}T00:00:00Z`);
  const to = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) return null;

  /*
   * Years only past two of them. At thirteen months "One year" both rounds
   * away four months of someone's history and reads as less than it is —
   * "Fourteen months" is the truer sentence.
   */
  const days = Math.round((to - from) / 86_400_000);
  if (days >= 730) return unit(Math.round(days / 365), "year");
  if (days >= 60) return unit(Math.round(days / 30), "month");
  if (days >= 14) return unit(Math.round(days / 7), "week");
  return unit(days, "day");
}

function unit(n: number, noun: string): string {
  const word = spell(n);
  return `${word.charAt(0).toUpperCase()}${word.slice(1)} ${noun}${n === 1 ? "" : "s"}`;
}

/**
 * The closing line. Both halves are measured: the span comes from the
 * earliest trade date in the ledger, the duration from the clock around the
 * sync. If either is missing the line degrades rather than guesses.
 */
export function arrivalLine(progress: SyncProgress, today: string): string {
  const span = spanLabel(progress.earliestDate, today);
  const seconds = progress.elapsedMs == null ? null : Math.max(1, Math.round(progress.elapsedMs / 1000));

  if (span && seconds != null) {
    return `${span} of history arrived in ${spell(seconds)} second${seconds === 1 ? "" : "s"}.`;
  }
  if (span) return `${span} of history arrived.`;
  if (progress.transactions) {
    return `${NUMBER.format(progress.transactions)} transactions arrived.`;
  }
  return "Your brokerage returned no history to read.";
}
