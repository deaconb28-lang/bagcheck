import styles from "./marketing.module.css";

const COUNT = 63;

/**
 * Deterministic daily P&L for a quarter: a positive bias carrying two real
 * drawdown clusters. 44 green days to 19 red, with a worst losing run of six
 * — a winning quarter that still had weeks worth sitting through, which is
 * the behaviour the product is about.
 */
const pnl = (i: number) => {
  const trend = 0.34 + Math.sin(i * 0.21) * 0.3;
  const noise = Math.sin(i * 1.93) * 0.42 + Math.cos(i * 0.77) * 0.28;
  const drawdown = i > 24 && i < 31 ? -1.15 : i > 46 && i < 50 ? -0.95 : 0;
  return trend + noise + drawdown;
};

const SERIES = Array.from({ length: COUNT }, (_, i) => pnl(i));
const PEAK = Math.max(...SERIES.map(Math.abs));

/**
 * The quarter's P&L, spanning the hero. Up from the surface is a green day
 * and the green deepens with the size of it; below the surface is a red one,
 * in clay — the only place in the system that colour is allowed.
 *
 * Each bar carries its index as --i. Scroll-driven CSS uses it to stagger a
 * pulse left to right as the page moves; without scroll timelines the bars
 * stand at their real values, which is the reading either way.
 */
export function DayStrip() {
  return (
    <div className={styles.wave} aria-hidden="true">
      <span className={styles.waveZero} />
      {SERIES.map((v, i) => {
        const mag = Math.abs(v) / PEAK;
        return (
          <span key={i} className={styles.waveCol}>
            <span
              className={styles.waveBar}
              data-dir={v >= 0 ? "up" : "down"}
              style={
                {
                  height: `${(4 + mag * 42).toFixed(1)}%`,
                  // Bigger day, denser colour — magnitude reads twice.
                  opacity: (0.44 + mag * 0.56).toFixed(2),
                  "--i": i,
                } as React.CSSProperties
              }
            />
          </span>
        );
      })}
    </div>
  );
}
