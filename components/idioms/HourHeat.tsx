import styles from "./HourHeat.module.css";

export type HourCell = {
  /** Mean return in the window, signed. Null when the window is empty. */
  mean: number | null;
  n: number;
};

export type HourHeatProps = {
  days: string[];
  hours: string[];
  /** Row-major: cells[dayIndex][hourIndex]. */
  cells: HourCell[][];
};

/**
 * Hour by weekday, signed. Two ramps meeting at zero — moss for windows that
 * paid, clay for windows that did not, and an empty window is empty rather
 * than neutral-coloured, because "no trades at 9am on a Monday" is a
 * different fact from "flat at 9am on a Monday".
 */
export function HourHeat({ days, hours, cells }: HourHeatProps) {
  const peak = cells.flat().reduce((m, c) => Math.max(m, Math.abs(c.mean ?? 0)), 0) || 1;

  return (
    <div className={styles.wrap}>
      <div className={styles.hours} style={{ "--cols": hours.length } as React.CSSProperties}>
        <span />
        {hours.map((h) => (
          <span key={h} className={styles.hourLabel}>
            {h}
          </span>
        ))}
      </div>
      {days.map((day, r) => (
        <div key={day} className={styles.row} style={{ "--cols": hours.length } as React.CSSProperties}>
          <span className={styles.dayLabel}>{day}</span>
          {hours.map((hour, c) => {
            const cell = cells[r]?.[c] ?? { mean: null, n: 0 };
            const strength = cell.mean == null ? 0 : Math.min(1, Math.abs(cell.mean) / peak);
            return (
              <i
                key={hour}
                className={styles.cell}
                data-sign={cell.mean == null ? "none" : cell.mean >= 0 ? "up" : "down"}
                style={{ "--a": strength.toFixed(3) } as React.CSSProperties}
                title={
                  cell.n === 0
                    ? `${day} ${hour}:00 — no entries`
                    : `${day} ${hour}:00 — ${cell.mean! >= 0 ? "+" : "−"}${Math.abs(cell.mean!).toFixed(1)}% over ${cell.n}`
                }
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
