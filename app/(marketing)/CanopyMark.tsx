/**
 * The canopy mark — a layered crown over a trunk, with one amber tier.
 *
 * It replaces the bag, and it keeps that mark's grammar exactly: a filled body
 * in `currentColor` so the mark sits in whatever ink its row uses, and a
 * single stroke in the one fixed hue. Only the shape changed, so every surface
 * that already knew how to place the old mark places this one.
 *
 * Amber, still. Green would be the obvious canopy colour and it is the one
 * hue this product cannot spend here — `--moss` means money up and nothing
 * else, and a green wordmark would put the P&L's colour on every screen
 * whatever the P&L did. Violet is the product's own voice, reserved for what
 * it concluded. Amber was the bag's tick and it stays the brand's one hue.
 *
 * Drawn rather than fetched, like the rail's route glyphs: it has to be on the
 * first paint of every page and take `currentColor`, and a fetched mark would
 * be a dependency in the critical render path of the landing.
 *
 * The geometry is tuned for 16px. At favicon size the three tiers merge into a
 * single dome and the amber arc is the only thing left with its own identity,
 * which is why it sits at the crown rather than the base.
 */
export function CanopyMark({ size = 34, accent }: { size?: number; accent?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" fill="none" aria-hidden="true">
      {/* The canopy: a wide dome with a flat underside, filled. */}
      <path
        d="M4.5 20.4C4.5 13.5 10.1 7.9 17 7.9s12.5 5.6 12.5 12.5a2 2 0 0 1-2 2h-21a2 2 0 0 1-2-2z"
        fill="currentColor"
      />
      {/* The trunk, the same weight as the bag's handle. */}
      <path d="M17 22.4v5.4" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      {/* The lit tier. One hue, one stroke, at the crown where it survives 16px. */}
      <path
        d="M10.6 17.1a6.6 6.6 0 0 1 12.8 0"
        stroke={accent ?? "var(--mk-amber)"}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
