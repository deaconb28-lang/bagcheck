import styles from "./Teaser.module.css";

/**
 * What a locked thing will look like, drawn.
 *
 * Two surfaces gate something and then have to say what is behind the gate:
 * the unearned frames in the Wrapped deck, and the roadmap of features under
 * construction. Both were text-only, which is honest and completely
 * unpersuasive — "8 closed winners and 8 closed losers" tells a reader the
 * rule and nothing about what they get for following it.
 *
 * So each one carries a picture of its own readout. **Every drawing is
 * shapes, never numerals**: the whole claim of this product is that its
 * figures came off a brokerage, and a teaser with a plausible number on it
 * is the one thing that would undermine every real number beside it. A ring
 * with a gap in it says "a score"; it does not say 82.
 *
 * They are drawn here rather than fetched, for the same reason the rail's
 * route glyphs are: they have to be on the first paint, they take
 * `currentColor`, and a locked tile that waits on a network round trip to
 * show what it is hiding is worse than one that shows nothing.
 *
 * `--teaser-lit` is the one lit colour in a drawing and the caller sets it —
 * violet where the thing is Canopy's own reading, green where it is money,
 * amber where it is scarce.
 */

export type TeaserKind =
  /* The score and its parts */
  | "ring"
  | "components"
  | "percentile"
  | "paragraph"
  /* Identity */
  | "age"
  | "archetypes"
  | "streak"
  | "records"
  /* Patterns */
  | "hours"
  | "sessionSize"
  | "exitSpeed"
  | "conviction"
  | "eventWindow"
  /* Practice */
  | "twoTap"
  | "ledger"
  | "digest"
  | "cardFan"
  /* Card-only shapes */
  | "hold"
  | "stamp"
  | "cadence"
  | "months"
  | "equity";

const DIM = "currentColor";

export function Teaser({ kind, className }: { kind: TeaserKind; className?: string }) {
  return (
    <span className={`${styles.teaser} ${className ?? ""}`} aria-hidden="true">
      <svg viewBox="0 0 120 78" className={styles.svg} role="presentation">
        <Drawing kind={kind} />
      </svg>
    </span>
  );
}

function Drawing({ kind }: { kind: TeaserKind }) {
  const line = { fill: "none", stroke: DIM, strokeLinecap: "round" as const };

  switch (kind) {
    /* One number a night — an arc with a gap, and nothing written in it. */
    case "ring":
      return (
        <>
          <circle {...line} cx="60" cy="39" r="21" strokeWidth="7" opacity="0.22" />
          <circle
            cx="60"
            cy="39"
            r="21"
            fill="none"
            stroke="var(--teaser-lit)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray="94 132"
            transform="rotate(-90 60 39)"
          />
        </>
      );

    /* Four meters, four lengths. The decomposition under the score. */
    case "components":
      return (
        <>
          {[0.78, 0.52, 0.9, 0.63].map((w, i) => (
            <g key={i}>
              <rect x="20" y={16 + i * 13} width="80" height="4" rx="2" fill={DIM} opacity="0.18" />
              <rect
                x="20"
                y={16 + i * 13}
                width={80 * w}
                height="4"
                rx="2"
                fill={i === 2 ? "var(--teaser-lit)" : DIM}
                opacity={i === 2 ? 1 : 0.5}
              />
            </g>
          ))}
        </>
      );

    /* Where today sits — a distribution with a marker, never a percentage. */
    case "percentile":
      return (
        <>
          <path
            d="M14 58c14 0 16-30 32-30s20 22 32 22 14-10 28-10"
            {...line}
            strokeWidth="3"
            opacity="0.3"
          />
          <path d="M14 58h94" {...line} strokeWidth="2" opacity="0.16" />
          <path d="M78 20v38" stroke="var(--teaser-lit)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="78" cy="20" r="4" fill="var(--teaser-lit)" />
        </>
      );

    /* The written read — lines of prose, no words. */
    case "paragraph":
      return (
        <>
          <rect x="18" y="18" width="6" height="42" rx="3" fill="var(--teaser-lit)" />
          {[74, 82, 66, 44].map((w, i) => (
            <rect key={i} x="34" y={20 + i * 11} width={w} height="5" rx="2.5" fill={DIM} opacity={0.34 - i * 0.05} />
          ))}
        </>
      );

    /* Investor Age — a scale with a pin on it. */
    case "age":
      return (
        <>
          <path d="M16 48h88" {...line} strokeWidth="3" opacity="0.2" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path key={i} d={`M${16 + i * 17.6} 48v${i % 2 ? 6 : 9}`} {...line} strokeWidth="2" opacity="0.2" />
          ))}
          <path d="M56 22v26" stroke="var(--teaser-lit)" strokeWidth="3" strokeLinecap="round" />
          <circle cx="56" cy="22" r="6" fill="var(--teaser-lit)" />
        </>
      );

    /* Sixteen corners of a four-bit cube; you land in exactly one. */
    case "archetypes":
      return (
        <>
          {Array.from({ length: 16 }, (_, i) => {
            const c = i % 4;
            const r = Math.floor(i / 4);
            const lit = i === 9;
            return (
              <rect
                key={i}
                x={26 + c * 18}
                y={10 + r * 16}
                width={13}
                height={12}
                rx="4"
                fill={lit ? "var(--teaser-lit)" : DIM}
                opacity={lit ? 1 : 0.2}
              />
            );
          })}
        </>
      );

    /* A run of sessions inside the rules, and where it broke. */
    case "streak":
      return (
        <>
          {[1, 1, 1, 1, 1, 0, 1].map((on, i) => (
            <rect
              key={i}
              x={14 + i * 14}
              y="30"
              width="10"
              height="18"
              rx="4"
              fill={on ? "var(--teaser-lit)" : DIM}
              opacity={on ? 1 : 0.18}
            />
          ))}
        </>
      );

    /* Personal bests — ranked rows, your own and nobody else's. */
    case "records":
      return (
        <>
          {[86, 62, 44].map((w, i) => (
            <g key={i}>
              <circle cx="22" cy={22 + i * 17} r="5" fill={i === 0 ? "var(--teaser-lit)" : DIM} opacity={i === 0 ? 1 : 0.28} />
              <rect x="34" y={19 + i * 17} width={w * 0.72} height="6" rx="3" fill={DIM} opacity={0.3 - i * 0.07} />
            </g>
          ))}
        </>
      );

    /* Entries by hour — a day, with the late bars below the line. */
    case "hours":
      return (
        <>
          <path d="M12 42h96" {...line} strokeWidth="2" opacity="0.18" />
          {[14, 20, 11, 17, 8, -12, -18, -9].map((h, i) => (
            <rect
              key={i}
              x={14 + i * 12.5}
              y={h > 0 ? 42 - h : 42}
              width="8"
              height={Math.abs(h)}
              rx="3"
              fill={h > 0 ? DIM : "var(--teaser-lit)"}
              opacity={h > 0 ? 0.32 : 1}
            />
          ))}
        </>
      );

    /* Two trades or six — one pair of bars, one clearly shorter. */
    case "sessionSize":
      return (
        <>
          <path d="M14 60h92" {...line} strokeWidth="2" opacity="0.18" />
          <rect x="26" y="20" width="24" height="40" rx="6" fill={DIM} opacity="0.32" />
          <rect x="66" y="38" width="24" height="22" rx="6" fill="var(--teaser-lit)" />
        </>
      );

    /* Winners held against losers held. */
    case "exitSpeed":
      return (
        <>
          <rect x="16" y="22" width="34" height="9" rx="4.5" fill="var(--teaser-lit)" />
          <rect x="16" y="45" width="88" height="9" rx="4.5" fill={DIM} opacity="0.3" />
        </>
      );

    /* High conviction against low, as a slope with its points. */
    case "conviction":
      return (
        <>
          <path d="M16 26l88 28" {...line} strokeWidth="3" opacity="0.24" />
          {[
            [22, 30],
            [44, 36],
            [64, 40],
            [86, 48],
            [102, 54],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="5" fill={i === 0 ? "var(--teaser-lit)" : DIM} opacity={i === 0 ? 1 : 0.34} />
          ))}
        </>
      );

    /* A specific drawdown, measured against its own window. */
    case "eventWindow":
      return (
        <>
          <rect x="42" y="12" width="34" height="54" rx="7" fill="var(--teaser-lit)" opacity="0.16" />
          <path
            d="M12 30c12 0 18 4 26 12s12 16 20 12 16-20 24-24 16-2 26-2"
            {...line}
            strokeWidth="3.4"
            opacity="0.55"
          />
        </>
      );

    /* Two taps: a reason, and a conviction from one to five. */
    case "twoTap":
      return (
        <>
          <rect x="16" y="16" width="42" height="16" rx="8" fill="var(--teaser-lit)" />
          <rect x="64" y="16" width="40" height="16" rx="8" fill={DIM} opacity="0.22" />
          {[0, 1, 2, 3, 4].map((i) => (
            <circle key={i} cx={24 + i * 18} cy="52" r="7" fill={i < 3 ? DIM : DIM} opacity={i < 3 ? 0.36 : 0.16} />
          ))}
        </>
      );

    /* Every round trip, reconciled — a table with its figures on the right. */
    case "ledger":
      return (
        <>
          <path d="M12 22h96" {...line} strokeWidth="2" opacity="0.24" />
          {[0, 1, 2].map((i) => (
            <g key={i}>
              <rect x="12" y={32 + i * 14} width="38" height="6" rx="3" fill={DIM} opacity="0.28" />
              <rect
                x={72 + i * 4}
                y={32 + i * 14}
                width={36 - i * 4}
                height="6"
                rx="3"
                fill={i === 1 ? "var(--teaser-lit)" : DIM}
                opacity={i === 1 ? 1 : 0.34}
              />
            </g>
          ))}
        </>
      );

    /* One message a week, with the week in it. */
    case "digest":
      return (
        <>
          <rect x="16" y="14" width="88" height="50" rx="10" fill={DIM} opacity="0.12" />
          <rect x="26" y="24" width="46" height="6" rx="3" fill={DIM} opacity="0.36" />
          {[10, 18, 13, 22, 16].map((h, i) => (
            <rect
              key={i}
              x={26 + i * 13}
              y={54 - h}
              width="8"
              height={h}
              rx="3"
              fill={i === 3 ? "var(--teaser-lit)" : DIM}
              opacity={i === 3 ? 1 : 0.3}
            />
          ))}
        </>
      );

    /* The set, minted again — cards fanned. */
    case "cardFan":
      return (
        <>
          <rect x="22" y="18" width="30" height="44" rx="7" fill={DIM} opacity="0.18" transform="rotate(-9 37 40)" />
          <rect x="45" y="16" width="30" height="46" rx="7" fill={DIM} opacity="0.28" />
          <rect x="68" y="18" width="30" height="44" rx="7" fill="var(--teaser-lit)" transform="rotate(9 83 40)" />
        </>
      );

    /* A hold that outlived a normal one. */
    case "hold":
      return (
        <>
          <path d="M18 39h84" {...line} strokeWidth="2" opacity="0.18" />
          <rect x="18" y="33" width="76" height="12" rx="6" fill="var(--teaser-lit)" />
          <circle cx="18" cy="39" r="6" fill={DIM} opacity="0.4" />
          <circle cx="102" cy="39" r="6" fill={DIM} opacity="0.4" />
        </>
      );

    /* A thing that did not happen, stamped. */
    case "stamp":
      return (
        <>
          <circle {...line} cx="60" cy="39" r="24" strokeWidth="3" opacity="0.24" />
          <circle {...line} cx="60" cy="39" r="18" strokeWidth="2" opacity="0.16" />
          <path
            d="M50 39.5l7 7 14-14"
            fill="none"
            stroke="var(--teaser-lit)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      );

    /* How many sessions a week, week after week. */
    case "cadence":
      return (
        <>
          {[3, 4, 3, 5, 4, 3, 4, 2].map((n, i) => (
            <g key={i}>
              {Array.from({ length: n }, (_, j) => (
                <rect
                  key={j}
                  x={16 + i * 12}
                  y={56 - j * 9}
                  width="8"
                  height="7"
                  rx="2.5"
                  fill={i === 3 ? "var(--teaser-lit)" : DIM}
                  opacity={i === 3 ? 1 : 0.28}
                />
              ))}
            </g>
          ))}
        </>
      );

    /* Month by month, above and below the line. */
    case "months":
      return (
        <>
          <path d="M12 40h96" {...line} strokeWidth="2" opacity="0.18" />
          {[16, -9, 22, 12, -14, 19].map((h, i) => (
            <rect
              key={i}
              x={16 + i * 16}
              y={h > 0 ? 40 - h : 40}
              width="11"
              height={Math.abs(h)}
              rx="3.5"
              fill={h > 0 ? "var(--teaser-lit)" : DIM}
              opacity={h > 0 ? 0.85 : 0.34}
            />
          ))}
        </>
      );

    /* The account, over the year. */
    case "equity":
      return (
        <>
          <path
            d="M12 58c14-4 20-14 30-16s16 8 24-2 16-22 42-26"
            fill="none"
            stroke="var(--teaser-lit)"
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          <path d="M12 66h96" {...line} strokeWidth="2" opacity="0.16" />
        </>
      );
  }
}
