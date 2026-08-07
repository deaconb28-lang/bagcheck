import type { RoundTrip, Streak } from "@/lib/score";

export type { RoundTrip, Streak };

export type CardKind = "score" | "hold" | "quarter" | "streak";

/** The minimal score shape a card needs — keeps this layer free of Mongo. */
export interface ScoreDocLite {
  date: string;
  score: number;
}

/** A card, fully described and ready to render. No I/O reaches this. */
export interface CardSpec {
  kind: CardKind;
  label: string;
  value: string;
  tail: string;
  tone: "moss" | "signal";
  /** Set only when the behaviour behind the card is scarce. */
  rarity: "rare" | null;
}
