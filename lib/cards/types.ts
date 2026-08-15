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

/**
 * A spec, reduced to what a stranger reads.
 *
 * This lived inside `/api/cards/mint` as a route-local helper, which made it
 * unreachable from anything else that needs to mint — the seed script wants
 * exactly this mapping, and duplicating it would be two definitions of what a
 * card says. The conversion is card-domain logic and pure, so it lives here.
 */
export function storedFrom(spec: import("./kinds").CardSpec): StoredCard {
  const value =
    spec.body.kind === "figure" || spec.body.kind === "chart" ? spec.body.value : spec.headline;
  return {
    kind: spec.kind,
    label: spec.eyebrow,
    value,
    tail: spec.lede,
    // The public card has two tones; the four card hues fold onto them.
    tone: spec.hue === "azure" || spec.hue === "violet" ? "signal" : "moss",
    rarity: spec.rarity,
    symbol: spec.symbol,
  };
}
