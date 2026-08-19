/**
 * The supercruise mark — a dart through a broken ring.
 *
 * Everything is `currentColor` and nothing is knocked out, which is a change
 * from the level mark this replaces: that one punched its counter through a
 * filled disc so the shape took the colour of whatever it stood on, and needed
 * a `ground` prop to say what that was. A stroked ring with a solid dart across
 * it needs no counter at all — one drawing sits on the black field, on a white
 * marketing hero and on a share card with no variant and no prop.
 *
 * The ring is broken where the dart crosses it, at the two points the flight
 * path enters and leaves. That break is the whole idea: the instrument does not
 * contain the thing it is measuring — the thing is going through it and out the
 * far side. `pathLength` normalises the circumference to 100 so the dashes are
 * percentage points and the gaps land where the geometry says rather than where
 * a radius calculation happened to put them.
 *
 * Supercruise is sustained supersonic flight without afterburner — speed you
 * hold rather than speed you spend. That is the same claim the product makes
 * about a portfolio: it does not measure how fast you went once, it measures
 * whether you can keep the account at that altitude. The trails are two, not
 * five, because a mark at 28px is a silhouette and everything past the third
 * line is mush.
 */
export function SupercruiseMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none" aria-hidden="true">
      {/*
        * The ring, broken at the entry and the exit. The dash run starts at 3
        * o'clock and goes clockwise, so 37.5 is lower-left and 87.5 is
        * upper-right — the two points the flight path crosses.
        *
        * The dash list has an even number of values, which is not a style
        * point: SVG repeats an odd list to make it even, so "31 13 37 13 6"
        * becomes a 200-unit pattern over a 100-unit path and lays a stray tick
        * at three o'clock on the second lap. Two dashes and two gaps sum to
        * 100, and the offset is what slides the gaps onto the flight path.
        */}
      <circle
        cx="17"
        cy="17"
        r="13"
        pathLength="100"
        stroke="currentColor"
        strokeWidth="2"
        strokeDasharray="37 13 37 13"
        strokeDashoffset="6"
        strokeLinecap="butt"
      />

      {/*
        * The dart. A concave notch in the trailing edge is what separates a
        * paper plane from a triangle, and at nav size it is the only detail
        * that survives — so it is the only one drawn.
        */}
      <path d="M28 5.6 L9.6 16.8 L16.7 19.2 L17.3 26.4 Z" fill="currentColor" />

      {/* The wake. Two strokes on the flight axis, tapering away from it. */}
      <path
        d="M13.4 22.8 L7.2 29"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8.4 18.8 L3 24.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

/**
 * The wordmark. Lowercase in chrome, always — prose says Supercruise, a logo
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
      supercruise
    </span>
  );
}
