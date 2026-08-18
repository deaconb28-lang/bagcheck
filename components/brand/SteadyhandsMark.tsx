/**
 * The steadyhands mark — a level read inside a dial.
 *
 * A disc in `currentColor` with the level's vial knocked *through* it and the
 * bubble sitting dead centre. The knock-out is the one structural idea carried
 * over from the bag mark it replaces: the counter takes the colour of whatever
 * the mark stands on, which is why `ground` is a prop, and it is what lets one
 * drawing sit on the plum field, on a white marketing hero and on a share card
 * with no variant for each.
 *
 * The disc is not decoration. A bare capsule with a dot in it was the first
 * attempt, and at nav size — 28px, where this mark spends its whole life — it
 * reads as a battery indicator or a toggle switch. A logo that reads as a UI
 * control is worse than no logo. The disc fixes it two ways: it is unmistakably
 * an instrument rather than a widget, and it echoes the score ring, which is
 * the shape this product's own hero is already drawn in.
 *
 * A level is the right instrument for this product. Steadyhands does not
 * measure what you made; it measures whether you held the account the way you
 * said you would — and a level is the one tool whose entire job is to tell you
 * whether you are true. It is also abstract: no hand is drawn, because a
 * drawing of a hand beside somebody's own ledger makes a claim about them that
 * the ledger never made.
 */
export function SteadyhandsMark({
  size = 28,
  ground,
}: {
  size?: number;
  /** What the bubble reads as. The surface behind the mark, not a brand hue. */
  ground?: string;
}) {
  const knock = ground ?? "var(--bg)";
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none" aria-hidden="true">
      {/* The dial, which is the shape this product's own hero is drawn in. */}
      <circle cx="17" cy="17" r="15" fill="currentColor" />
      {/* The vial, knocked through it. */}
      <rect x="5.6" y="13.4" width="22.8" height="7.2" rx="3.6" fill={knock} />
      {/* The bubble, dead centre — which is the whole point of the drawing. */}
      <circle cx="17" cy="17" r="2.5" fill="currentColor" />
    </svg>
  );
}

/**
 * The wordmark. Lowercase in chrome, always — prose says Steadyhands, a logo
 * never does, and a capital here is the one typo a wordmark cannot survive.
 */
export function Wordmark({ size = 23 }: { size?: number }) {
  return (
    <span
      style={{
        fontSize: size,
        fontWeight: 700,
        letterSpacing: "-0.035em",
        lineHeight: 1,
      }}
    >
      steadyhands
    </span>
  );
}
