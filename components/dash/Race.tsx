import type { RaceField } from "@/lib/returns";
import styles from "./race.module.css";

/**
 * The Race — five lanes, one car each, all running for the same 2.6 seconds.
 *
 * That equal duration is the whole trick: every car sets off together and they
 * all arrive together, so a longer lane can only read as a *faster* car. Give
 * them a shared speed instead and the chart becomes a staggered list that
 * happens to have vehicles on it.
 *
 * **Every lane is a fund with a ticker.** There is no hedge-fund index in this
 * repository and no key for one, so nothing here is labelled "hedge funds" in
 * the aggregate: the field is four funds that exist to replicate hedge-fund
 * strategies plus the S&P, each quoted from the same provider as every other
 * mark on the screen. A car labelled with a number nobody can check is the one
 * thing this panel must not draw.
 *
 * The reader's own lane takes violet and amber — the product's own voice and
 * the colour of a record. Everyone else's car is a grey, darkening down the
 * field, because a competitor is a shape rather than a reading.
 */
export function Race({ field }: { field: RaceField }) {
  const top = Math.max(...field.rows.map((row) => row.value), 0);
  const bottom = Math.min(...field.rows.map((row) => row.value), 0);
  const span = top - bottom || 1;

  return (
    <div className={styles.surface}>
      <div className={styles.lanes}>
        {field.rows.map((row, i) => {
          /*
           * How far down the lane the car finishes. A negative return still
           * runs forward — the lane is a ranking, not an axis — so the reach
           * is measured from the field's floor rather than from zero, and the
           * figure beside the car is what states the sign.
           */
          const reach = ((row.value - bottom) / span) * 0.84 + 0.12;
          return (
            <div key={row.key} className={styles.lane} data-you={row.you || undefined}>
              <span className={styles.badge}>P{i + 1}</span>

              <span className={styles.label}>
                <span className={styles.name}>{row.label}</span>
                <span className={styles.note}>{row.note}</span>
              </span>

              <span className={styles.track}>
                <i className={styles.road} aria-hidden="true" />
                <span
                  className={styles.viewport}
                  style={{ width: `${(reach * 100).toFixed(1)}%` }}
                >
                  <i
                    className={styles.trail}
                    style={{ animationDelay: `${(0.3 + i * 0.12).toFixed(2)}s` }}
                    aria-hidden="true"
                  />
                  <span
                    className={styles.runner}
                    style={{ animationDelay: `${(0.3 + i * 0.12).toFixed(2)}s` }}
                  >
                    <span className={styles.car}>
                      <Car lead={row.you} index={i} />
                      <span className={`num ${styles.figure}`}>
                        {row.value >= 0 ? "+" : "−"}
                        {Math.abs(row.value * 100).toFixed(1)}%
                      </span>
                    </span>
                  </span>
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className={styles.axis}>
        <span />
        <span />
        <div className={styles.axisScale}>
          <span>Start</span>
          <span className={styles.leader}>Leader</span>
        </div>
      </div>
    </div>
  );
}

/**
 * The car. One drawing, five paints.
 *
 * The leader's body is a real `<linearGradient>` rather than a `fill` set to a
 * CSS gradient string — SVG has no such paint value, and a browser handed one
 * silently drops the attribute and paints the shape black. The mock did
 * exactly that, which is why its winning car was a black car.
 */
function Car({ lead, index }: { lead?: boolean; index: number }) {
  const id = `car-lead-${index}`;
  return (
    <svg
      width="66"
      height="30"
      viewBox="0 0 66 30"
      className={styles.body}
      data-lead={lead || undefined}
      aria-hidden="true"
    >
      {lead ? (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--lead-car-from)" />
            <stop offset="55%" stopColor="var(--lead-car-mid)" />
            <stop offset="100%" stopColor="var(--lead-car-to)" />
          </linearGradient>
        </defs>
      ) : null}
      <path
        d="M3 21c0-3 2-5 5-5l8-6c2-1.4 4-2 6.2-2h17c2.6 0 5 1 7 2.8l6 5.2h7c3.4 0 5.8 2 5.8 5v2c0 1.7-1.3 3-3 3H6c-1.7 0-3-1.3-3-3z"
        fill={lead ? `url(#${id})` : `var(--car-${Math.min(index + 1, 5)})`}
      />
      <path d="M20 11.4c1.4-1 3-1.4 4.6-1.4h6.6v6H16z" fill="rgba(255,255,255,0.34)" />
      <path d="M34 10h6.6c1.8 0 3.4.6 4.8 1.8l4 4.2H34z" fill="rgba(255,255,255,0.34)" />
      <circle cx="19" cy="25" r="5" fill={lead ? "var(--tyre-lead)" : "var(--tyre)"} />
      <circle cx="47" cy="25" r="5" fill={lead ? "var(--tyre-lead)" : "var(--tyre)"} />
      <circle cx="19" cy="25" r="1.9" fill="rgba(255,255,255,0.5)" />
      <circle cx="47" cy="25" r="1.9" fill="rgba(255,255,255,0.5)" />
    </svg>
  );
}
