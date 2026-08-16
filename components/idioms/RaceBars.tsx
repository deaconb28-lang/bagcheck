import styles from "./RaceBars.module.css";
import type { RaceField } from "@/lib/returns";

/**
 * The field, year to date, as a race read from the front.
 *
 * Horizontal because a race is horizontal, and off a zero line because a fund
 * down four percent is behind the line rather than a differently coloured bar
 * of the same length. The line goes to the left edge when nothing in the field
 * is negative, so a good year does not spend half its width on the half
 * nothing reaches.
 *
 * **Hue is the only thing separating the reader from the field, and it is the
 * one hue that means what it says.** Every comparison row is `--signal`, which
 * is what this palette gives exposure and percentile; the reader's own row is
 * money, so it takes moss or loss like every other figure they own. Nothing
 * here fills, ranks by colour, or paints a winner.
 *
 * The bars run at the same time and arrive at different lengths, which is what
 * a race looks like. Under reduced motion they are simply already there — the
 * static state is the finished chart, as it must be.
 */
export function RaceBars({ field }: { field: RaceField }) {
  const rows = field.rows;

  const top = Math.max(...rows.map((r) => r.value), 0);
  const bottom = Math.min(...rows.map((r) => r.value), 0);
  const span = top - bottom || 1;
  /* Where the line sits: hard left when the whole field is up. */
  const zero = (-bottom / span) * 100;

  return (
    <div
      className={styles.race}
      style={{ "--zero": `${zero.toFixed(2)}%` } as React.CSSProperties}
    >
      <ol className={styles.rows}>
        {rows.map((row, i) => {
          const up = row.value >= 0;
          const width = (Math.abs(row.value) / span) * 100;
          return (
            <li
              key={row.key}
              className={styles.row}
              data-you={row.you || undefined}
              data-dir={up ? "up" : "down"}
            >
              <span className={styles.label}>
                <span className={styles.name}>{row.label}</span>
                <span className={styles.note}>{row.note}</span>
              </span>

              <span className={styles.track}>
                <i
                  className={styles.bar}
                  style={{
                    /*
                     * The width is the inline value, never the keyframe's
                     * endpoint — so with the animation off, the finished chart
                     * is what renders.
                     */
                    width: `${Math.max(width, 0.4).toFixed(2)}%`,
                    /* Meter rhythm, capped inside the 300ms stagger budget. */
                    animationDelay: `${Math.min(i * 70, 280)}ms`,
                  }}
                />
              </span>

              <span className={`num ${styles.figure}`}>
                {row.value >= 0 ? "+" : "−"}
                {Math.abs(row.value * 100).toFixed(1)}%
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
