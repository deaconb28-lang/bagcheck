import { money, signedPct } from "./Chrome";
import type { DashboardView } from "@/lib/portfolio/types";
import styles from "./positionsTable.module.css";

/**
 * The book as a table.
 *
 * The dashboard drew this account three ways — a polar chart, a bar chart and
 * a treemap — and never once as a list of its positions. Every portfolio
 * product worth looking at leads with the table: Monarch, Origin, Quicken,
 * Fey and Kraken all make it the primary object, and the abstractions sit
 * around it. The reason is not fashion. A chart answers *which is biggest*
 * and *which is up* at a glance and cannot answer *what is NVDA worth*, which
 * is the question a holder actually arrives with.
 *
 * ── What it states, and what it refuses to ────────────────────────────────
 *
 * Six columns, all off the same refreshed snapshot every other chart here
 * draws: the name, what a share cost against what it is worth now, the share
 * of the account, the return on that cost, the position's value, and its
 * unrealised P&L in money.
 *
 * A holding the broker priced but gave no cost basis for keeps its row and
 * shows an em dash in the two columns that need one. It is not dropped — it
 * is part of the account and its value is real — and it is not drawn at zero,
 * because zero is a claim. That is the same rule the wheel follows by leaving
 * it off the chart entirely; a chart has no way to say "unanswered", and a
 * table does.
 *
 * Colour reaches the return and the P&L and stops. The logo, the ticker, the
 * price pair and the value are all ink: a table where every column is lit is
 * a table with no emphasis at all.
 */
export function PositionsTable({ positions }: { positions: DashboardView["positions"] }) {
  const priced = positions.filter((position) => position.value > 0);
  if (priced.length < 2) return null;

  const total = priced.reduce((sum, position) => sum + position.value, 0);
  /* Largest first: the account's own order of consequence. */
  const rows = [...priced].sort((a, b) => b.value - a.value);

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={styles.name}>Position</th>
            <th scope="col" className={styles.num}>Cost → now</th>
            <th scope="col" className={styles.num}>Weight</th>
            <th scope="col" className={styles.num}>Return</th>
            <th scope="col" className={styles.num}>Value</th>
            <th scope="col" className={styles.num}>Unrealised</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const weight = total > 0 ? (row.value / total) * 100 : 0;
            const dir = row.pnlPct == null ? "flat" : row.pnlPct >= 0 ? "up" : "down";
            return (
              <tr key={row.symbol}>
                <th scope="row" className={styles.name}>
                  <span className={styles.who}>
                    {/* `/api/logo` always answers with an image, so there is
                        no broken state to handle — a ticker nobody has a mark
                        for comes back as a drawn monogram. */}
                    <img
                      className={styles.logo}
                      src={`/api/logo/${encodeURIComponent(row.symbol)}`}
                      alt=""
                      width={26}
                      height={26}
                    />
                    <span className={styles.who2}>
                      <span className={styles.symbol}>{row.symbol}</span>
                      {row.name ? <span className={styles.company}>{row.name}</span> : null}
                    </span>
                  </span>
                </th>

                <td className={`num ${styles.num} ${styles.prices}`}>
                  {row.basis != null && row.price != null ? (
                    <>
                      {money(row.basis, 2)} <span className={styles.arrow}>→</span>{" "}
                      {money(row.price, 2)}
                    </>
                  ) : (
                    <span className={styles.absent}>—</span>
                  )}
                </td>

                <td className={`num ${styles.num}`}>{weight.toFixed(1)}%</td>

                <td className={`num ${styles.num}`}>
                  {row.pnlPct == null ? (
                    <span className={styles.absent}>—</span>
                  ) : (
                    <span className={styles.chip} data-dir={dir}>
                      {signedPct(row.pnlPct)}
                    </span>
                  )}
                </td>

                <td className={`num ${styles.num}`}>{money(row.value)}</td>

                <td className={`num ${styles.num}`} data-dir={dir}>
                  {row.pnl == null ? (
                    <span className={styles.absent}>—</span>
                  ) : (
                    <span className={styles.pnl} data-dir={dir}>
                      {row.pnl >= 0 ? "+" : "−"}
                      {money(Math.abs(row.pnl))}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
