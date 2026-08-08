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

export const ROUTES: RouteDef[] = [
  { href: "/home", label: "Home", Glyph: HomeGlyph },
  { href: "/dna", label: "DNA", Glyph: DnaGlyph },
  { href: "/wrapped", label: "Wrapped", Glyph: WrappedGlyph },
  { href: "/patterns", label: "Patterns", Glyph: PatternsGlyph },
  { href: "/insights", label: "Insights", Glyph: InsightsGlyph },
  { href: "/ledger", label: "Ledger", Glyph: LedgerGlyph },
  { href: "/cards", label: "Cards", Glyph: CardsGlyph },
];

/**
 * Five on mobile. Patterns and Ledger reach the phone through links on Home
 * rather than a sixth tab — seven 48px targets across 390px leaves 55px each,
 * which is a tab bar you mis-tap.
 */
export const MOBILE_ROUTES: RouteDef[] = ROUTES.filter(
  (route) => !["/patterns", "/ledger"].includes(route.href),
);
