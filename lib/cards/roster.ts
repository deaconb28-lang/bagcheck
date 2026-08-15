import type { TeaserKind } from "@/components/cards/Teaser";
import type { CardKind, CardSpec } from "./kinds";

/**
 * The full set, and what earns each one.
 *
 * `buildCards` returns only the cards a ledger has actually earned, which is
 * correct — a statistic drawn from four round trips is a coincidence with a
 * number on it, and the file that builds cards is right to return `null`
 * rather than a greyed-out one. But the *screen* then had nothing to show: a
 * three-month-old account earned two cards, and a page whose entire job is
 * "look how much you got" rendered two cards and an acre of empty field.
 *
 * So the deck is always the full thirteen. An earned frame carries its card;
 * an unearned one carries its name and the one condition that opens it. That
 * is the same promise the locked tiles elsewhere in the product make — the
 * slot its unlocked twin would take, with the requirement stated — and it is
 * the honest version of a full deck, because nothing here invents a figure.
 *
 * Pure. The `requires` lines are written from the sample floors in `kinds.ts`
 * and the test holds them to the same set of kinds, so a new card kind cannot
 * ship without a line here saying what earns it.
 */

export interface RosterEntry {
  kind: CardKind;
  /** What the card is called when it does not exist yet. */
  name: string;
  /** The one condition that mints it. Present tense, no dates, no promises. */
  requires: string;
  /**
   * The drawing an unearned frame wears.
   *
   * Shapes only — a teaser with a plausible figure on it would undermine
   * every real figure beside it, on the one screen whose whole claim is that
   * its numbers came off a brokerage.
   */
  teaser: TeaserKind;
}

/**
 * Deck order. The annual summary leads because it is the only card about the
 * whole year rather than one thing inside it; identity follows; then the
 * readings, then the series. Earned or not, a kind holds its place — the
 * frame numbers have to mean the same thing on every reader's screen.
 */
export const ROSTER: readonly RosterEntry[] = [
  { kind: "wrapped", name: "Your year", requires: "365 scored days", teaser: "cardFan" },
  { kind: "archetype", name: "Your archetype", requires: "one scored day", teaser: "archetypes" },
  { kind: "health", name: "Health score", requires: "one scored day", teaser: "ring" },
  { kind: "streak", name: "Current streak", requires: "14 consecutive sessions inside your rules", teaser: "streak" },
  { kind: "longestHold", name: "Longest hold", requires: "a position held 30 days", teaser: "hold" },
  { kind: "holdRatio", name: "Winners run", requires: "8 closed winners and 8 closed losers", teaser: "exitSpeed" },
  { kind: "bestDecision", name: "Best call", requires: "one round trip closed green", teaser: "records" },
  { kind: "drawdownHeld", name: "Held through", requires: "a 10% drawdown you did not sell", teaser: "eventWindow" },
  { kind: "noPanic", name: "Zero panic", requires: "60 scored days with no panic sell", teaser: "stamp" },
  { kind: "cadence", name: "Weekly rhythm", requires: "8 weeks of sessions", teaser: "cadence" },
  { kind: "monthlyPnl", name: "Realised months", requires: "4 months of realised P&L", teaser: "months" },
  { kind: "equity", name: "Account curve", requires: "30 days of account value", teaser: "equity" },
  { kind: "correlation", name: "Conviction decay", requires: "conviction tags on 30 entries", teaser: "conviction" },
] as const;

export interface Frame {
  /** 1-based, and stable across readers — the frame number is a name. */
  no: number;
  kind: CardKind;
  name: string;
  requires: string;
  teaser: TeaserKind;
  /** The built card, or null where the ledger has not earned it yet. */
  card: CardSpec | null;
}

/**
 * The deck: every kind in roster order, each carrying its card or its
 * condition. Cards `buildCards` produced that the roster does not name are
 * appended rather than dropped — a card that exists must always be reachable,
 * even if this file has fallen behind `kinds.ts`.
 */
export function deckFrames(cards: CardSpec[]): Frame[] {
  const byKind = new Map(cards.map((c) => [c.kind, c]));
  const frames: Frame[] = ROSTER.map((entry, i) => ({
    no: i + 1,
    kind: entry.kind,
    name: entry.name,
    requires: entry.requires,
    teaser: entry.teaser,
    card: byKind.get(entry.kind) ?? null,
  }));

  const named = new Set(ROSTER.map((e) => e.kind));
  for (const card of cards) {
    if (named.has(card.kind)) continue;
    frames.push({
      no: frames.length + 1,
      kind: card.kind,
      name: card.headline,
      requires: "",
      teaser: "cardFan",
      card,
    });
  }

  return frames;
}

/** How many of the set this ledger has actually minted. */
export function earnedCount(frames: Frame[]): number {
  return frames.filter((f) => f.card).length;
}

/**
 * Where the player should open when the reader presses play: the first frame
 * that has a card. Opening a story player on a locked frame would start the
 * year on a blank.
 */
export function firstEarned(frames: Frame[]): number {
  const i = frames.findIndex((f) => f.card);
  return i < 0 ? 0 : i;
}
