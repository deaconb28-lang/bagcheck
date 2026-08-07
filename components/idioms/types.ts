/**
 * One idiom per statement, each legible at 200px wide.
 * Every idiom is a pure function of its data — no fetching, no state.
 */

/** What a single trading day says about the person. */
export type DayState =
  /** Inside their rules. Moss. */
  | "kept"
  /** Partly inside. Dimmed moss. */
  | "partial"
  /** Exposure ran above their baseline. Signal. */
  | "exposed"
  /** Nothing scored that day. Track. */
  | "empty";

export const DAY_FILL: Record<DayState, string> = {
  kept: "var(--moss)",
  partial: "var(--moss-dim)",
  exposed: "var(--signal)",
  empty: "var(--track)",
};
