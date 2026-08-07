/**
 * Route marks — drawn, not an icon set. Each is a geometric reduction of
 * what the screen shows: a segment ring, a position stack, a report
 * sheet, a profile ring.
 */

type MarkProps = { active?: boolean };

const STROKE = 1.7;

export function TodayMark({ active }: MarkProps) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none">
      <circle cx="10" cy="10" r="7.4" stroke="currentColor" strokeWidth={STROKE} opacity={active ? 0.32 : 0.28} />
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
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none">
      <path
        d="M3 13.4 7 9l3.2 2.8L17 5"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 17h14" stroke="currentColor" strokeWidth={STROKE} strokeLinecap="round" opacity=".32" />
    </svg>
  );
}

export function ReportsMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none">
      <rect
        x="3.4"
        y="2.8"
        width="13.2"
        height="14.4"
        rx="2.4"
        stroke="currentColor"
        strokeWidth={STROKE}
        opacity=".32"
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
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" fill="none">
      <circle cx="10" cy="7.4" r="3.2" stroke="currentColor" strokeWidth={STROKE} />
      <path
        d="M4 17c.9-3.1 3.1-4.7 6-4.7s5.1 1.6 6 4.7"
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        opacity=".32"
      />
    </svg>
  );
}

export const ROUTES = [
  { href: "/today", label: "Today", Mark: TodayMark },
  { href: "/portfolio", label: "Portfolio", Mark: PortfolioMark },
  { href: "/reports", label: "Reports", Mark: ReportsMark },
  { href: "/profile", label: "Profile", Mark: ProfileMark },
] as const;
