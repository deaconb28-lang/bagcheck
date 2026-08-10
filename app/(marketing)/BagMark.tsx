/**
 * The bag mark — a bag with an amber check inside it. Body and handle take
 * `currentColor` so the mark sits in whatever ink its row uses; the check is
 * the one fixed hue, except on the dark footer where it inverts to the field.
 */
export function BagMark({ size = 34, check }: { size?: number; check?: string }) {
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
        stroke={check ?? "var(--mk-amber)"}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
