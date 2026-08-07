/**
 * Route marks — drawn, not an icon set. Each is a geometric reduction of what
 * the screen shows: a score ring, a position stack, a ledger, a report sheet,
 * a profile. They sit in the sidebar's 15px glyph column.
 */

type MarkProps = { active?: boolean };

const STROKE = 1.6;
const SIZE = 16;

function svgProps() {
  return {
    width: SIZE,
    height: SIZE,
    viewBox: "0 0 20 20",
    "aria-hidden": true as const,
    fill: "none",
  };
}

export function TodayMark({ active }: MarkProps) {
  return (
    <svg {...svgProps()}>
      <circle
        cx="10"
        cy="10"
        r="7.4"
        stroke="currentColor"
        strokeWidth={STROKE}
        opacity={active ? 0.36 : 0.3}
      />
      <path
        d="M10 2.6a7.4 7.4 0 0 1 6.4 11.1"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PortfolioMark() {
  return (
    <svg {...svgProps()}>
      <path
        d="M3 13.4 7 9l3.2 2.8L17 5"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 17h14" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" opacity=".34" />
    </svg>
  );
}

/** The ledger: stacked entries, the newest one solid. */
export function ActivityMark() {
  return (
    <svg {...svgProps()}>
      <path d="M3.4 5.4h13.2" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" />
      <path
        d="M3.4 10h13.2M3.4 14.6h8.4"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        opacity=".34"
      />
    </svg>
  );
}

export function ReportsMark() {
  return (
    <svg {...svgProps()}>
      <rect
        x="3.4"
        y="2.8"
        width="13.2"
        height="14.4"
        rx="2.4"
        stroke="currentColor"
        strokeWidth={STROKE}
        opacity=".34"
      />
      <path
        d="M6.8 7.4h6.4M6.8 10.6h6.4M6.8 13.8h3.4"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ProfileMark() {
  return (
    <svg {...svgProps()}>
      <circle cx="10" cy="7.4" r="3.2" stroke="currentColor" strokeWidth={STROKE} />
      <path
        d="M4 17c.9-3.1 3.1-4.7 6-4.7s5.1 1.6 6 4.7"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        opacity=".34"
      />
    </svg>
  );
}

/** Correlations: two axes crossing, and the cluster that carries the finding. */
export function PatternsMark() {
  return (
    <svg {...svgProps()}>
      <path
        d="M3.4 3.4v13.2h13.2"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity=".34"
      />
      <circle cx="7.4" cy="12.6" r="1.5" fill="currentColor" />
      <circle cx="11" cy="9.4" r="1.5" fill="currentColor" />
      <circle cx="14.4" cy="5.8" r="1.5" fill="currentColor" />
    </svg>
  );
}

/** Plain names, no invented words. */
export const ROUTES = [
  { href: "/today", label: "Today", Mark: TodayMark },
  { href: "/portfolio", label: "Portfolio", Mark: PortfolioMark },
  { href: "/activity", label: "Activity", Mark: ActivityMark },
  { href: "/patterns", label: "Patterns", Mark: PatternsMark },
  { href: "/reports", label: "Reports", Mark: ReportsMark },
] as const;

/** Below the divider, as in the handoff's shell. */
export const SECONDARY_ROUTES = [
  { href: "/profile", label: "Profile", Mark: ProfileMark },
] as const;
