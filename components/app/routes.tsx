/**
 * The seven routes and their glyphs.
 *
 * Drawn inline, not fetched: these are chrome, they must be present on the
 * first paint of every screen, and they take `currentColor` so the rail's
 * active state is one background swap rather than seven assets. The Noun
 * Project layer stays where it belongs — labelling data, not navigation.
 */

type GlyphProps = { size?: number };

function svg(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.7,
    "aria-hidden": true as const,
    style: { display: "block" as const },
  };
}

export function HomeGlyph({ size = 21 }: GlyphProps) {
  return (
    <svg {...svg(size)} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.2 12 3.5l9 6.7V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

/** A helix — the behaviour that repeats, which is what DNA is here. */
export function DnaGlyph({ size = 21 }: GlyphProps) {
  return (
    <svg {...svg(size)} strokeLinecap="round">
      <path d="M7 3c0 5 10 5 10 9s-10 4-10 9" />
      <path d="M17 3c0 5-10 5-10 9s10 4 10 9" />
      <path d="M8.4 7h7.2M8.4 17h7.2M7.6 12h8.8" />
    </svg>
  );
}

export function WrappedGlyph({ size = 21 }: GlyphProps) {
  return (
    <svg {...svg(size)} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="3.4" />
      <path d="M10.6 9.2v5.6l4.6-2.8z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PatternsGlyph({ size = 21 }: GlyphProps) {
  return (
    <svg {...svg(size)} strokeLinecap="round">
      <circle cx="6" cy="17" r="1.7" />
      <circle cx="11" cy="10" r="1.7" />
      <circle cx="16" cy="14" r="1.7" />
      <circle cx="20" cy="6" r="1.7" />
    </svg>
  );
}

export function InsightsGlyph({ size = 21 }: GlyphProps) {
  return (
    <svg {...svg(size)} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.5 18h5M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.8 1 .9 1.6l.1.6h5.2l.1-.6c.1-.6.4-1.2.9-1.6A6 6 0 0 0 12 3z" />
    </svg>
  );
}

export function LedgerGlyph({ size = 21 }: GlyphProps) {
  return (
    <svg {...svg(size)} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4h13a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H5z" />
      <path d="M5 4a2 2 0 0 0 0 4h2" />
      <path d="M10 11h6M10 15h4" />
    </svg>
  );
}

export function CardsGlyph({ size = 21 }: GlyphProps) {
  return (
    <svg {...svg(size)} strokeLinejoin="round">
      <rect x="7" y="4" width="12" height="16" rx="2.6" />
      <path d="M4.2 7.4v10.2a2 2 0 0 0 1.6 2" strokeLinecap="round" />
    </svg>
  );
}

export function MarkGlyph({ size = 17 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: "block" }}>
      <circle
        cx="12"
        cy="12"
        r="8.5"
        stroke="var(--on-moss)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeDasharray="40 14"
      />
    </svg>
  );
}

export type RouteDef = {
  href: string;
  label: string;
  Glyph: (props: GlyphProps) => React.ReactElement;
};

/**
 * One destination, plus the avatar at the foot for settings.
 *
 * There were seven, then three, and now one. Four of the original seven — DNA,
 * Patterns, Insights and Cards — asked one question between them and became
 * `/you`; then Home merged into it too, because "how is it going" and "what
 * does my history say" are one question with two halves and splitting them put
 * the money on one screen and its explanation on another.
 *
 * Wrapped came off this list deliberately. It is the subpage the dashboard's
 * year block opens into — a destination you go to *from* the product rather
 * than a tab beside it, which is what it always was in practice. Navigation is
 * furniture: with a single screen there is nothing to navigate between, and a
 * rail that pretends otherwise is chrome asking to be read.
 *
 * Every route retired from this list still resolves. They are redirect stubs,
 * because those URLs are in bookmarks and in links minted before the renames.
 */

/* ── Six marks, drawn for the six sections ────────────────────────────────
 *
 * The rail went up with borrowed glyphs: Holdings wore the patterns mark and
 * Trophies wore the cards mark, because those were the drawings that already
 * existed. An icon-only rail cannot borrow — the mark *is* the label there,
 * and two sections wearing a third section's drawing is a rail that lies
 * twice.
 *
 * Each is built from something the section actually contains rather than a
 * generic noun: the dashboard is the dart's own ring, holdings are stacked
 * positions at different weights, insights is a rule with a reading off it,
 * trophies is a filled disc on a ribbon, wrapped is a card in a deck, public
 * is a card with a share arrow leaving it. All `currentColor`, all on the
 * first paint, none fetched.
 */

export function DashGlyph({ size = 21 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.7" pathLength="100"
        strokeDasharray="37 13 37 13" strokeDashoffset="6" />
      <path d="M18 6.2 L8.5 12 L12.2 13.2 L12.5 17" fill="currentColor" />
    </svg>
  );
}

export function HoldingsGlyph({ size = 21 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="3.4" rx="1.2" fill="currentColor" />
      <rect x="3.5" y="10.3" width="12" height="3.4" rx="1.2" fill="currentColor" opacity=".72" />
      <rect x="3.5" y="15.6" width="7.5" height="3.4" rx="1.2" fill="currentColor" opacity=".44" />
    </svg>
  );
}

export function ReadGlyph({ size = 21 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3.5 15.5 L8.5 10 L12 13 L20.5 4.5" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="1.9" fill="currentColor" />
      <path d="M3.5 19.5h17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".45" />
    </svg>
  );
}

export function TrophyGlyph({ size = 21 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="9" r="5.4" fill="currentColor" />
      <path d="M8.6 13.6 L7 21 l5-2.6 L17 21 l-1.6-7.4" stroke="currentColor" strokeWidth="1.7"
        strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function DeckGlyph({ size = 21 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="7" y="3.5" width="12" height="16" rx="2.4" stroke="currentColor" strokeWidth="1.7"
        transform="rotate(7 13 11.5)" />
      <rect x="4" y="5.5" width="11" height="15" rx="2.2" fill="currentColor" />
    </svg>
  );
}

export function ShareGlyph({ size = 21 }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3.5" y="8" width="12" height="12.5" rx="2.4" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 10.5 L20.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M15 3.5h5.5V9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
        strokeLinejoin="round" />
    </svg>
  );
}

export const ROUTES: RouteDef[] = [
  { href: "/you", label: "Dashboard", Glyph: DashGlyph },
  { href: "/holdings", label: "Holdings", Glyph: HoldingsGlyph },
  { href: "/insights", label: "Insights", Glyph: ReadGlyph },
  { href: "/trophies", label: "Trophies", Glyph: TrophyGlyph },
  { href: "/wrapped", label: "Wrapped", Glyph: DeckGlyph },
  { href: "/public", label: "Public", Glyph: ShareGlyph },
];

/**
 * The phone gets five, not seven.
 *
 * All six sections plus the account is seven labelled targets across 390px,
 * which crowds every label and clips the longest. The reference apps do not
 * go past five — Public runs five, Whoop four — so the phone carries the
 * dashboard, the holdings, the insights, the year, and the account. Trophies
 * and the public page are a tap further in rather than a tab nobody can read.
 *
 * The account has to be one of them: the rail is gone at this width and its
 * foot is where settings, the linked institution and sign-out live.
 */
export const MOBILE_ROUTES: RouteDef[] = [
  ROUTES[0],
  ROUTES[1],
  ROUTES[2],
  ROUTES[4],
  { href: "/profile", label: "Account", Glyph: DnaGlyph },
];
