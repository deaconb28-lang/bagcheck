import styles from "./ZeroBarChart.module.css";
import type { WaveDay } from "./types";

/**
 * Realised P&L, as columns off a zero line.
 *
 * **Saturation is the data.** Ordinary sessions sit back at a fraction of the
 * hue and only the outliers — the best and worst days in the window — take it
 * at full strength. A chart where every bar is fully saturated is a chart
 * where colour has stopped carrying information, which is the same failure
 * the dashboard had at the screen level.
 *
 * The zero line is drawn once and the columns hang off it in both directions,
 * so a losing session reads as below the line rather than as a differently
 * coloured bar of the same height. Heights are relative to the largest
 * absolute move in the window: this is the shape of a period, not a
 * measurement anyone should read a figure off, and the figure is stated above
 * it in type.
 */
export function ZeroBarChart({
  days,
  height = 168,
}: {
  days: WaveDay[];
  /** The full span, both sides of the line. */
  height?: number;
}) {
  if (days.length === 0) return null;

  const peak = Math.max(...days.map((d) => Math.abs(d.amount)), 1);
  /* The outliers, and only them, get the hue at full strength. */
  const best = Math.max(...days.map((d) => d.amount));
  const worst = Math.min(...days.map((d) => d.amount));

  /*
   * Where the zero line sits, and therefore how much height a bar can use.
   *
   * Centred it always was, which is right when the period has both kinds of
   * session and wrong the rest of the time: a run with no red day spent half
   * its box on the half nothing reaches, so the block read as a chart with a
   * void under it. The line goes to the floor when every session is green and
   * to the ceiling when every one is red, and the bars take the whole height —
   * the same drawing, without the empty half.
   */
  const down = worst < 0;
  const up = best > 0;
  const both = down && up;
  const zeroAt = both ? 50 : down ? 0 : 100;
  const room = both ? 50 : 100;

  return (
    <div
      className={styles.chart}
      style={{ height, "--zero-at": `${zeroAt}%` } as React.CSSProperties}
      role="img"
      aria-label={`Realised P&L across ${days.length} sessions`}
    >
      <span className={styles.zero} aria-hidden="true" />
      <div className={styles.cols}>
        {days.map((d, i) => {
          const share = Math.abs(d.amount) / peak;
          const up = d.amount >= 0;
          const strong = d.amount === best || d.amount === worst;
          return (
            <span key={`${d.date}-${i}`} className={styles.col}>
              <i
                className={styles.bar}
                data-dir={up ? "up" : "down"}
                data-strong={strong || undefined}
                style={{
                  height: `${Math.max(share * room, 0.6)}%`,
                  animationDelay: `${Math.min(i * 8, 400)}ms`,
                }}
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}
