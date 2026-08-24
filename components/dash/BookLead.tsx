import { Contribution, Wheel, type ContributionRow } from "@/components/idioms";
import type { WheelBenchmark, WheelPosition } from "@/lib/wheel";
import styles from "./bookLead.module.css";

/**
 * The dashboard's lead: the wheel, and the reading it cannot give.
 *
 * The wheel states a *rate* — return on cost — and a rate is blind to size.
 * A position at a tenth of a percent of the book showing +45% reaches further
 * out than anything else on the chart and moved the account by nothing at
 * all. That is not a flaw in the wheel; it is what a rate means, and it is
 * the reason the wheel cannot be the only thing on this block.
 *
 * So the same book runs down the right in dollars, ranked by what actually
 * moved. Two readings of one thing: *how did it do*, and *did it matter*.
 *
 * The wheel takes the larger share and is the only object here with a figure
 * set in the poster face — this block has one focal point and the layout says
 * which. Below 1080px the column drops beneath it rather than narrowing:
 * a polar chart squeezed into half a phone is not a chart.
 */
export function BookLead({
  positions,
  bookReturn,
  benchmark,
  value,
  contributions,
  money,
}: {
  positions: WheelPosition[];
  bookReturn: number;
  benchmark: WheelBenchmark | null;
  /** The account value, formatted. The wheel derives its own figure and count. */
  value: string;
  contributions: ContributionRow[];
  money: (value: number) => string;
}) {
  return (
    <div className={styles.grid}>
      <div className={styles.figure}>
        <Wheel
          positions={positions}
          bookReturn={bookReturn}
          benchmark={benchmark}
          value={value}
        />
      </div>

      {contributions.length ? (
        <div className={styles.aside}>
          <Contribution rows={contributions} money={money} />
        </div>
      ) : null}
    </div>
  );
}
