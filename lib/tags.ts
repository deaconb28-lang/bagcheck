/**
 * The tag loop — pure.
 *
 * Why and conviction are the only inputs a brokerage cannot supply, and every
 * correlation in the engine depends on them. The thresholds below are the
 * sample floors those correlations need; they are stated once, here, so a
 * screen promising "correlations unlock at 100" and an engine that silences
 * itself below its floor cannot drift apart.
 */

/** The five reasons, as chips. No text field — two taps is the whole loop. */
export const WHY_OPTIONS = [
  "Thesis",
  "Momentum",
  "Saw it online",
  "Felt cheap",
  "Revenge",
] as const;

export type Why = (typeof WHY_OPTIONS)[number];

export function isWhy(value: unknown): value is Why {
  return typeof value === "string" && (WHY_OPTIONS as readonly string[]).includes(value);
}

/**
 * TagDoc persists the reason lower-cased, and documents written before this
 * file existed already carry that spelling. Storage and display are kept
 * apart here rather than in each caller so they cannot drift.
 */
export type WhyKey = Lowercase<Why>;

export function whyKey(why: Why): WhyKey {
  return why.toLowerCase() as WhyKey;
}

/** The chip label for a stored key. Unknown keys stay null rather than guess. */
export function whyLabel(key: string | null | undefined): Why | null {
  if (!key) return null;
  const match = WHY_OPTIONS.find((w) => w.toLowerCase() === key.toLowerCase());
  return match ?? null;
}

export type Conviction = 1 | 2 | 3 | 4 | 5;

export function isConviction(value: unknown): value is Conviction {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

/** Correlations across all tags need this many entries on file. */
export const CORRELATION_FLOOR = 100;
/** One *kind* of tag starts showing up in Patterns at this many. */
export const KIND_FLOOR = 30;

export interface TagProgress {
  tagged: number;
  total: number;
  /** How many more entries need a why before correlations unlock. */
  remaining: number;
  /** 0–100, clamped — the meter width. */
  pct: number;
  unlocked: boolean;
}

export function tagProgress(tagged: number, total: number): TagProgress {
  const remaining = Math.max(0, CORRELATION_FLOOR - tagged);
  return {
    tagged,
    total,
    remaining,
    pct: Math.max(0, Math.min(100, (tagged / CORRELATION_FLOOR) * 100)),
    unlocked: tagged >= CORRELATION_FLOOR,
  };
}

/**
 * The line under the meter. Descriptive: it reports where the data stands and
 * never tells the reader to go and tag something.
 */
export function progressLine(p: TagProgress): string {
  return p.unlocked
    ? `${p.tagged} of ${p.total} entries tagged · correlations are running`
    : `${p.tagged} of ${CORRELATION_FLOOR} tagged · correlations unlock at ${CORRELATION_FLOOR}`;
}

export interface UntaggedEntry {
  externalId: string;
  symbol: string;
  date: string;
  amount: number | null;
  units: number | null;
  currency: string | null;
}

/**
 * The queue, newest first. Only opening trades can carry a why — a sell has
 * no thesis, and asking for one would be asking the user to invent a reason
 * after the fact.
 */
export function untaggedQueue(
  buys: UntaggedEntry[],
  taggedIds: Set<string>,
  limit = 12,
): UntaggedEntry[] {
  return buys
    .filter((entry) => !taggedIds.has(entry.externalId))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

/** "3 entries have no why on file" — the eyebrow over the prompt. */
export function queueLine(count: number): string {
  if (count === 0) return "Every entry has a why on file";
  return `${count} ${count === 1 ? "entry has" : "entries have"} no why on file`;
}
