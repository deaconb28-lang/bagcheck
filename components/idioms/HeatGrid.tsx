import styles from "./HeatGrid.module.css";

export type HeatDay = {
  date: string;
  /** 0–4 on the ramp. 0 is an empty cell, not a missing one. */
  level: 0 | 1 | 2 | 3 | 4;
  note?: string;
  /**
   * Which way the day went, when the grid is measuring money.
   *
   * Absent on a consistency grid, which is one measurement in one ramp. Money
   * is not one measurement — a day up and a day down are opposite facts, and
   * the hue is the only thing that can carry that at this cell size. A cell
   * with a level but no tone paints the neutral ramp, so the two uses share a
   * component without either one bending.
   */
  tone?: "up" | "down";
};

/**
 * Weeks across, weekdays down.
 *
 * A consistency grid is a single statement in five steps and gets one ramp and
 * no second colour. A *money* grid is two statements — how much, and which way
 * — so when the days carry a `tone` the cells take a green or red ramp
 * instead. The legend follows: one-sided for the ramp, two-sided for money.
 *
 * The 15px cell cap and the horizontal scroll are load-bearing rather than
 * cosmetic. A hundred-odd cells stretched to a panel's full width become 24px
 * tiles and the panel reads as one saturated block — a density grid is a
 * texture, not a fill.
 */
export function HeatGrid({ days, legend = true }: { days: HeatDay[]; legend?: boolean }) {
  /* Money if any day says which way it went. Inferred, so no caller can set
   * a legend that disagrees with the cells above it. */
  const money = days.some((day) => day.tone);
  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>
        {days.map((day, i) => (
          <i
            key={day.date}
            className={styles.cell}
            data-level={day.level}
            data-tone={day.tone}
            title={day.note ?? day.date}
            style={{ animationDelay: `${Math.min(i * 4, 640)}ms` }}
          />
        ))}
      </div>
      {legend ? (
        <div className={styles.legend}>
          <span>{money ? "Down" : "Less"}</span>
          {money
            ? [
                ...[4, 3, 2, 1].map((l) => (
                  <i key={`d${l}`} className={styles.key} data-level={l} data-tone="down" />
                )),
                <i key="z" className={styles.key} data-level={0} />,
                ...[1, 2, 3, 4].map((l) => (
                  <i key={`u${l}`} className={styles.key} data-level={l} data-tone="up" />
                )),
              ]
            : [0, 1, 2, 3, 4].map((l) => (
                <i key={l} className={styles.key} data-level={l} />
              ))}
          <span>{money ? "Up" : "More"}</span>
        </div>
      ) : null}
    </div>
  );
}
