import { Wheel } from "@/components/idioms";
import type { WheelBenchmark, WheelPosition } from "@/lib/wheel";
import styles from "./bookLead.module.css";

/**
 * The dashboard's book block: the wheel, and nothing beside it.
 *
 * This used to be the wheel plus a second list — unrealised P&L per position,
 * ranked by what actually moved the account — on the argument that a *rate* is
 * blind to size and the wheel therefore cannot be the only reading. The
 * argument was right and the answer was wrong: the positions table two blocks
 * down already states unrealised P&L per position, in money, beside the
 * weight, the return, the value and what each name cost. The dashboard was
 * drawing one snapshot five times — the wheel, that list, this table, a return
 * chart grouped by industry, and a treemap of the same two variables — and a
 * reader cannot tell five readings of one fact from five facts.
 *
 * So the wheel keeps the reading only it can give: the shape of the book, and
 * whether a wedge crosses the line. The figures are in its own key and in the
 * table. Everything else came off the screen.
 */
export function BookLead({
  positions,
  bookReturn,
  benchmark,
}: {
  positions: WheelPosition[];
  bookReturn: number;
  benchmark: WheelBenchmark | null;
}) {
  return (
    <div className={styles.block}>
      <Wheel positions={positions} bookReturn={bookReturn} benchmark={benchmark} />
    </div>
  );
}
