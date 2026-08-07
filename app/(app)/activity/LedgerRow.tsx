import type { ActivityRow } from "@/lib/db";
import styles from "./activity.module.css";

const money = (value: number | null, currency: string | null) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
        maximumFractionDigits: 2,
      }).format(value);

const units = (value: number | null) =>
  value == null ? "—" : value.toLocaleString("en-US", { maximumFractionDigits: 4 });

/**
 * The ledger is record, not judgement — every row stays in ink. A sell is not
 * a loss, so clay never appears here, and a buy is not discipline, so moss
 * doesn't either. The symbol carries the scan; the signed amount carries
 * direction.
 */
export function LedgerRow({ row }: { row: ActivityRow }) {
  return (
    <div className={styles.row}>
      <div className={styles.left}>
        <span className={styles.date}>{row.date?.slice(0, 10) ?? "—"}</span>
        <span className={styles.type}>{row.type ?? "—"}</span>
      </div>
      <div className={styles.mid}>
        <span className={styles.symbol}>{row.symbol ?? "—"}</span>
        {row.description ? <span className={styles.desc}>{row.description}</span> : null}
      </div>
      <div className={styles.right}>
        {/* Three aligned columns on desktop; units and price fold under the
            amount on mobile so the instrument description keeps its width. */}
        <span
          className={styles.qty}
          data-empty={row.units == null && row.price == null ? "" : undefined}
        >
          <span className={styles.units}>{units(row.units)}</span>
          <span className={styles.price}>{money(row.price, row.currency)}</span>
        </span>
        <span className={styles.amount}>{money(row.amount, row.currency)}</span>
      </div>
    </div>
  );
}
