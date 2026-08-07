import type { RoundTrip, ScoreDocLite, Streak } from "./types";
import type { CardSpec } from "./types";

export type { CardSpec, CardKind, ScoreDocLite } from "./types";

/**
 * Layer 5 — what a card is, before anything renders it.
 *
 * Rarity is a fact about the behaviour, never about the tier. A card is rare
 * because the conduct behind it is scarce, so these thresholds are the only
 * place rarity is decided and nothing about billing reaches them.
 */

/** A quarter with no sells into a losing week is scarce. */
const RARE_QUARTER_DAYS = 60;
/** Whoop-scale: a hold measured in years, not weeks. */
const RARE_HOLD_DAYS = 365;
/** A score this high means the baseline was held all quarter. */
const RARE_SCORE = 92;
/** Streaks stop being common somewhere around a full quarter. */
const RARE_STREAK_DAYS = 90;

/**
 * Every card the user's history currently earns, strongest first.
 *
 * A card is only minted from something that actually happened — there is no
 * card for "you signed up", and nothing here can be bought.
 */
export function mintable(input: {
  score: ScoreDocLite | null;
  trips: RoundTrip[];
  streaks: Streak[];
  scoredDays: number;
  panicSells: number;
}): CardSpec[] {
  const { score, trips, streaks, scoredDays, panicSells } = input;
  const out: CardSpec[] = [];

  if (score) {
    out.push({
      kind: "score",
      label: "Bagcheck · discipline",
      value: String(score.score),
      tail: `discipline on ${score.date}, scored against your own baseline`,
      tone: "moss",
      rarity: score.score >= RARE_SCORE ? "rare" : null,
    });
  }

  const longest = trips.reduce<RoundTrip | null>(
    (best, t) => (!best || t.holdDays > best.holdDays ? t : best),
    null,
  );
  if (longest && longest.holdDays >= 30) {
    const d = Math.round(longest.holdDays);
    out.push({
      kind: "hold",
      label: "Bagcheck · longest hold",
      value: String(d),
      tail: `days holding ${longest.symbol} — your longest yet`,
      tone: "moss",
      rarity: d >= RARE_HOLD_DAYS ? "rare" : null,
    });
  }

  if (scoredDays >= RARE_QUARTER_DAYS && panicSells === 0) {
    out.push({
      kind: "quarter",
      label: "Bagcheck · quarter",
      value: "0",
      tail: `panic sells across ${scoredDays} scored days`,
      tone: "moss",
      rarity: "rare",
    });
  }

  const best = streaks.reduce<Streak | null>(
    (top, s) => (!top || s.days > top.days ? s : top),
    null,
  );
  if (best && best.days >= 14) {
    out.push({
      kind: "streak",
      label: "Bagcheck · streak",
      value: String(best.days),
      tail: `${best.name} and counting`,
      tone: "moss",
      rarity: best.days >= RARE_STREAK_DAYS ? "rare" : null,
    });
  }

  return out;
}

/**
 * The receipt strip under the number: 48 cells derived from the slug, so the
 * OG image and the public page draw exactly the same card without either
 * needing to re-read the ledger.
 */
export function stripCells(slug: string): number[] {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i += 1) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const cells: number[] = [];
  for (let i = 0; i < 48; i += 1) {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h ^= h >>> 13;
    const v = (h >>> 0) / 4294967295;
    cells.push(v > 0.82 ? 2 : v > 0.34 ? 1 : 0);
  }
  return cells;
}
