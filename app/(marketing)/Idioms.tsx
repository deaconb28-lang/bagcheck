import styles from "./marketing.module.css";

/*
 * Page-local idiom illustrations, deterministic and token-coloured.
 * The reusable data-driven idiom set arrives with M3 in components/idioms.
 */

/** Entries by hour — the signal cluster after 2pm is where the losses live. */
export function MiniScatter() {
  const dots = Array.from({ length: 60 }, (_, i) => {
    const x = 8 + ((i * 3.1) % 184);
    const late = x > 132;
    const y = Math.min(20 + Math.abs(Math.sin(i * 2.3)) * 62 + (late ? 12 : 0), 94);
    return { x, y, late };
  });
  return (
    <svg viewBox="0 0 200 104" className={styles.idiomSvg} aria-hidden="true">
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.x.toFixed(1)}
          cy={d.y.toFixed(1)}
          r="2.6"
          fill={d.late ? "var(--signal)" : "var(--moss-dim)"}
        />
      ))}
      <line
        x1="132"
        y1="6"
        x2="132"
        y2="98"
        stroke="var(--line2)"
        strokeWidth="1"
        strokeDasharray="3 3"
      />
    </svg>
  );
}

/** Win rate by trades per session — signal from the sixth trade on. */
export function WinRateBars() {
  const rates = [78, 80, 76, 74, 72, 58, 52, 47, 44];
  return (
    <svg viewBox="0 0 200 104" className={styles.idiomSvg} aria-hidden="true">
      {rates.map((rate, i) => {
        const h = (rate / 100) * 88;
        return (
          <rect
            key={i}
            x={4 + i * 22}
            y={96 - h}
            width="16"
            height={h.toFixed(1)}
            rx="2.5"
            fill={i >= 5 ? "var(--signal)" : "var(--moss-dim)"}
          />
        );
      })}
    </svg>
  );
}

/** Return by stated conviction, 1–5 — the top tag in moss. */
export function ConvictionBars() {
  const heights = [18, 26, 38, 54, 88];
  return (
    <svg viewBox="0 0 200 104" className={styles.idiomSvg} aria-hidden="true">
      {heights.map((h, i) => (
        <rect
          key={i}
          x={10 + i * 38}
          y={96 - h}
          width="26"
          height={h}
          rx="2.5"
          fill={i === 4 ? "var(--moss)" : "var(--moss-dim)"}
        />
      ))}
    </svg>
  );
}

/** Distribution over everyone in the same window — the user is the signal mark. */
export function DistributionWide() {
  let path = "M8 190 ";
  for (let x = 8; x <= 512; x += 8) {
    const y = 190 - 150 * Math.exp(-Math.pow((x - 208) / 92, 2));
    path += `L${x} ${y.toFixed(1)} `;
  }
  path += "L512 190 Z";
  return (
    <svg viewBox="0 0 520 200" className={styles.idiomSvg} aria-hidden="true">
      <path d={path} fill="var(--moss-tint)" stroke="var(--moss)" strokeWidth="1.8" />
      <line
        x1="436"
        y1="52"
        x2="436"
        y2="190"
        stroke="var(--signal)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="436" cy="52" r="4.5" fill="var(--signal)" />
    </svg>
  );
}
