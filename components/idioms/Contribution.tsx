import styles from "./Contribution.module.css";

/**
 * What actually moved the account.
 *
 * The wheel beside this states a *rate* — return on cost — and a rate is
 * blind to size: a position at a tenth of a percent of the book showing
 * +45.68% reaches further out than anything else on the chart and moved the
 * account by almost nothing. That is not a flaw in the wheel; it is what a
 * rate means. It is a reason the wheel cannot be the only reading.
 *
 * So this is the same book in dollars: unrealised profit and loss per
 * position, ranked by magnitude, off a zero line. Together the two answer the
 * question neither can alone — *how did it do* and *did it matter*.
 *
 * Direction is fill as well as colour, the way it is everywhere here: a gain
 * is solid, a loss is hatched behind a hairline. Every figure is in type, so
 * the bars are decoration on top of a readable list rather than the only way
 * to get the number.
 */

export interface ContributionRow {
  symbol: string;
  pnl: number;
}

export interface ContributionProps {
  rows: ContributionRow[];
  /** How many to draw. The rest are summed into one line beneath. */
  limit?: number;
  money: (value: number) => string;
}

export function Contribution({ rows, limit = 7, money }: ContributionProps) {
  const ranked = [...rows].sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl));
  const shown = ranked.slice(0, limit);
  const rest = ranked.slice(limit);
  const restSum = rest.reduce((sum, r) => sum + r.pnl, 0);

  /* The scale is the largest magnitude drawn, so the longest bar fills. */
  const peak = Math.max(...shown.map((r) => Math.abs(r.pnl)), 1);

  return (
    <figure className={styles.wrap}>
      <figcaption className={styles.head}>
        <p className={styles.eyebrow}>What moved the account</p>
        <p className={styles.note}>unrealised, per position</p>
      </figcaption>

      <ul className={styles.list}>
        {shown.map((row, i) => {
          const up = row.pnl >= 0;
          const share = Math.min(1, Math.abs(row.pnl) / peak);
          return (
            <li key={row.symbol} className={styles.row} style={{ animationDelay: `${i * 40}ms` }}>
              <span className={styles.symbol}>{row.symbol}</span>
              <span className={styles.track} aria-hidden="true">
                <i
                  className={styles.bar}
                  data-dir={up ? "up" : "down"}
                  style={{ transform: `scaleX(${share})` }}
                />
              </span>
              <span className={`num ${styles.value}`} data-dir={up ? "up" : "down"}>
                {up ? "+" : "−"}
                {money(Math.abs(row.pnl))}
              </span>
            </li>
          );
        })}
      </ul>

      {rest.length ? (
        <p className={styles.tail}>
          {rest.length} smaller {rest.length === 1 ? "position" : "positions"},{" "}
          {restSum >= 0 ? "+" : "−"}
          {money(Math.abs(restSum))} between them
        </p>
      ) : null}
    </figure>
  );
}
