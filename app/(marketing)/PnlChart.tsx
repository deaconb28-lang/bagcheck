import styles from "./landing.module.css";

/*
 * Forty-five trading days as bars off a zero line — the shape a ledger makes,
 * not a smoothed curve. Each day is a column split at the midline: gains grow
 * up from it, losses down. A day that moved the month gets the full-strength
 * colour; the rest sit at half so the outliers read first.
 *
 * The numbers are the design's sample ledger. They are illustrative, and the
 * card says so in its own tail.
 */
const DAYS: Array<[up: number, down: number, strong: boolean]> = [
  [36, 0, false], [74, 0, true], [27, 0, false], [9, 0, false], [60, 0, true],
  [0, 11, false], [19, 0, false], [20, 0, false], [64, 0, true], [21, 0, false],
  [0, 13, false], [0, 8, false], [0, 54, true], [0, 45, false], [17, 0, false],
  [11, 0, false], [0, 34, false], [9, 0, false], [47, 0, false], [35, 0, false],
  [0, 36, false], [46, 0, false], [0, 20, false], [0, 66, true], [0, 31, false],
  [46, 0, false], [78, 0, true], [0, 40, false], [0, 10, false], [8, 0, false],
  [50, 0, false], [61, 0, true], [15, 0, false], [42, 0, false], [0, 57, true],
  [47, 0, false], [52, 0, false], [0, 9, false], [26, 0, false], [8, 0, false],
  [24, 0, false], [0, 59, true], [0, 21, false], [9, 0, false], [0, 36, false],
];

export function PnlChart() {
  return (
    <div className={styles.pnl}>
      <div className={styles.pnlHead}>
        <span className={styles.insightEyebrow}>45-DAY P&amp;L</span>
        <div className={styles.pnlFigure}>
          <b>+$41,208</b>
          <span>+38.4%</span>
        </div>
      </div>

      <div className={styles.pnlChart}>
        <span className={styles.pnlZero} />
        {DAYS.map(([up, down, strong], i) => (
          <div key={i} className={styles.pnlCol}>
            <span className={styles.pnlUp}>
              <i
                style={{ height: `${up}px`, animationDelay: `${(i * 0.018).toFixed(3)}s` }}
                data-tone={down > 0 ? "loss" : "gain"}
                data-strong={strong || undefined}
              />
            </span>
            <span className={styles.pnlDown}>
              <i
                style={{ height: `${down}px`, animationDelay: `${(i * 0.018).toFixed(3)}s` }}
                data-tone={down > 0 ? "loss" : "gain"}
                data-strong={strong || undefined}
              />
            </span>
          </div>
        ))}
      </div>

      <div className={styles.pnlAxis}>
        <span>Jun 8</span>
        <span>Jun 22</span>
        <span>Jul 6</span>
        <span>Jul 20</span>
        <span>Aug 3</span>
      </div>
      <p className={styles.pnlTail}>45 trading days of P&amp;L, straight from your brokerage.</p>
    </div>
  );
}
