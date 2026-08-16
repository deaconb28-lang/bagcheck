/**
 * The bagcheck mark — a bag with a check punched out of it.
 *
 * The body and the handle take `currentColor`, so the mark sits in whatever
 * ink its row is already using and a nav never has to state a brand colour.
 * The check is knocked *through* the bag rather than drawn on top of it: it
 * takes the colour of whatever the mark is standing on, which is why `ground`
 * is a prop and defaults to the app's field.
 *
 * This replaces the canopy dome. The wordmark that goes beside it is
 * lowercase, always — see `<Wordmark>` below, which exists so no screen has to
 * remember that.
 */
export function BagcheckMark({
  size = 28,
  ground,
}: {
  size?: number;
  /** What the check reads as. The surface behind the mark, not a brand hue. */
  ground?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none" aria-hidden="true">
      <path
        d="M6 12.5h22a2 2 0 0 1 2 2v11a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-11a2 2 0 0 1 2-2z"
        fill="currentColor"
      />
      <path
        d="M12.5 12.5v-2.2a4.5 4.5 0 0 1 9 0v2.2"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M14.5 21.5l2.6 2.7 5-6"
        stroke={ground ?? "var(--bg)"}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The wordmark. Lowercase in chrome, always — prose says Bagcheck, a logo
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
      bagcheck
    </span>
  );
}
