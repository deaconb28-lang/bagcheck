import styles from "./marketing.module.css";

// Same deterministic sample data as the brand kit's hero ring.
const S = (i: number) => Math.sin(i * 1.7) + Math.cos(i * 0.53);

type SegState = "on" | "mid" | "sig" | "empty";

function segState(i: number): SegState {
  if (i > 54) return "empty";
  const v = S(i);
  if (v > 1.15) return "sig";
  if (v < -1.05) return "mid";
  return "on";
}

const SEG_COLOR: Record<SegState, string> = {
  on: "var(--moss)",
  mid: "var(--moss-dim)",
  sig: "var(--signal)",
  empty: "var(--track)",
};

/** 63 segments — one per trading day in a quarter. */
export function HeroRing() {
  const n = 63;
  const cx = 150;
  const cy = 150;
  const r = 128;
  const step = 360 / n;
  const gap = 1.6;

  const paths = Array.from({ length: n }, (_, i) => {
    const a0 = ((i * step - 90 + gap) * Math.PI) / 180;
    const a1 = (((i + 1) * step - 90 - gap) * Math.PI) / 180;
    const d = `M${(cx + r * Math.cos(a0)).toFixed(2)} ${(cy + r * Math.sin(a0)).toFixed(2)} A${r} ${r} 0 0 1 ${(cx + r * Math.cos(a1)).toFixed(2)} ${(cy + r * Math.sin(a1)).toFixed(2)}`;
    return { d, color: SEG_COLOR[segState(i)] };
  });

  return (
    <div className={styles.ring} aria-hidden="true">
      <svg viewBox="0 0 300 300">
        {paths.map((p, i) => (
          <path
            key={i}
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeWidth="7"
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div className={styles.ringCenter}>
        <div className={`num ${styles.ringValue}`}>82</div>
        <div className="eyebrow">Discipline</div>
      </div>
    </div>
  );
}
