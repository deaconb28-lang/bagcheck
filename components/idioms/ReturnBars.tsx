import { axisFor, groupByTheme, place, ramp, type Position } from "@/lib/flashpoint";
import styles from "./ReturnBars.module.css";

/**
 * Return by position, off a zero line, grouped by theme.
 *
 * The wheel says the same thing in polar and cannot say this: the exact
 * figures, the price a name cost against what it is worth now, and which
 * theme the exposure sits in. A rate on its own is the least useful true
 * thing about a position — *from what, to what* is the sentence a reader
 * actually wants, and it is two numbers the ledger already holds.
 *
 * ── What each channel carries ─────────────────────────────────────────────
 *
 *   bar length   return on cost, signed, off a zero rule
 *   inside bar   what share of the account is riding on it
 *   beside bar   the return, in type, because a bar is not a figure
 *   beneath      cost per unit to current price
 *   group        the provider's industry, ordered by exposure
 *
 * Direction is fill as well as position: a gain is solid and runs right, a
 * loss is hatched and runs left. Either alone would do, which is the point —
 * nothing here is carried by colour.
 */

export function ReturnBars({
  positions,
  money,
}: {
  positions: Position[];
  money: (value: number) => string;
}) {
  const groups = groupByTheme(positions);
  if (!groups.length) return null;

  const rets = groups.flatMap((g) => g.rows.map((r) => r.ret));
  const axis = axisFor(rets);
  const step = ramp(rets);
  const zero = axis.zero * 100;

  return (
    <figure className={styles.wrap}>
      <figcaption className={styles.head}>
        <p className={styles.eyebrow}>Return by position</p>
        <p className={styles.note}>
          Bar length is return on cost · the figure inside is what the account has riding on it
        </p>
      </figcaption>

      {/* The scale, once, across the top. */}
      <div className={styles.axis} aria-hidden="true">
        {axis.ticks.map((tick) => (
          <span
            key={tick}
            className={styles.tick}
            data-zero={Math.abs(tick) < 1e-9 || undefined}
            style={{ left: `${place(tick, axis) * 100}%` }}
          >
            {tick > 0 ? "+" : tick < 0 ? "−" : ""}
            {Math.abs(Math.round(tick * 100))}%
          </span>
        ))}
      </div>

      <div className={styles.plot}>
        {/* The zero rule runs the height of the chart, behind every bar. */}
        <i className={styles.rule} style={{ left: `${zero}%` }} aria-hidden="true" />

        {groups.map((group) => (
          <section key={group.label} className={styles.group}>
            <h3 className={styles.theme}>{group.label}</h3>

            {group.rows.map((row, i) => {
              const up = row.ret >= 0;
              const at = place(row.ret, axis) * 100;
              const left = up ? zero : at;
              const width = Math.max(Math.abs(at - zero), 0.4);
              return (
                <div
                  key={row.symbol}
                  className={styles.row}
                  style={{ animationDelay: `${Math.min(i * 22, 130)}ms` }}
                >
                  {/*
                    * The name sits on the side the bar runs *away* from, so
                    * the label and the bar never fight for the same pixels
                    * and the eye reads name-then-length in one direction.
                    */}
                  <div
                    className={styles.name}
                    data-side={up ? "left" : "right"}
                    style={up ? { right: `calc(${100 - zero}% + 14px)` } : { left: `calc(${zero}% + 14px)` }}
                  >
                    <span className={styles.symbol}>{row.symbol}</span>
                    {row.name ? <span className={styles.company}>{row.name}</span> : null}
                  </div>

                  <div
                    className={styles.bar}
                    data-dir={up ? "up" : "down"}
                    data-step={step(row.ret)}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  >
                    {/* Only where the bar is wide enough to hold it. */}
                    {width > 7 ? (
                      <span className={styles.weight}>{(row.weight * 100).toFixed(2)}%</span>
                    ) : null}
                  </div>

                  <div
                    className={styles.read}
                    data-side={up ? "right" : "left"}
                    style={
                      up
                        ? { left: `calc(${left + width}% + 12px)` }
                        : { right: `calc(${100 - left}% + 12px)` }
                    }
                  >
                    <span className={styles.figure} data-dir={up ? "up" : "down"}>
                      {up ? "+" : "−"}
                      {Math.abs(row.ret * 100).toFixed(2)}%
                    </span>
                    {row.basis != null && row.price != null ? (
                      <span className={`num ${styles.prices}`}>
                        {money(row.basis)} → {money(row.price)}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </figure>
  );
}
