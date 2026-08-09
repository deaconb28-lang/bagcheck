import type { RoundTrip, Streak } from "@/lib/score";

export type { RoundTrip, Streak };
export type { CardKind } from "./kinds";

/**
 * A card as it is *stored* and as a stranger reads it.
 *
 * Deliberately smaller than `CardSpec` in `./kinds`: the layout, the hue
 * family and the four art quantities are how a card was made, not what it
 * says, and the public page draws none of them. What survives into Mongo is
 * the label, the figure, the sentence and the tone.
 */
export interface StoredCard {
  kind: import("./kinds").CardKind;
  label: string;
  value: string;
  tail: string;
  tone: "moss" | "signal";
  /** Set only when the behaviour behind the card is scarce. */
  rarity: "rare" | null;
  /** The instrument the card is about, when it is about one. */
  symbol: string | null;
}
