import Link from "next/link";
import { money, signedPct } from "./Chrome";
import { EquityCurve } from "@/components/idioms";
import type { DashboardView, RangeKey } from "@/lib/portfolio/types";
import styles from "./moneyHero.module.css";

/**
 * The money, first.
 *
 * Six brokerage home screens were looked at before this was built — Fidelity,
 * Lightyear, Acorns, Copilot, QuestMobile and Quicken — and every one of them
 * opens the same way: the account's value, large, at the very top; the change
 * directly under it with an arrow and both the money and the percentage; then
 * a line across the full width with no axis furniture on it; then the ranges
 * as a row of pills. Nothing is above the value. Not a chart, not a promo,
 * not a heading.
 *
 * This screen had the value as small mono text *inside* another chart's
 * centre, which is the one place a reader opening the app is not looking. The
 * composition chart is still the set piece; it just is not the first thing,
 * because "how much do I have and did it move" is the question the app is
 * opened with and every product in the category answers it before anything
 * else.
 *
 * ── The chart carries no chrome ───────────────────────────────────────────
 *
 * Lightyear and Acorns draw the line and nothing else: no gridlines, no
 * y-axis, no legend. Fidelity allows itself a dotted baseline and two faint
 * labels. The rule they share is that a home screen chart is a *shape* — is
 * it up, is it steady — and every tick added to it is read once and then
 * never again.
 */

const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: "45d", label: "45D" },
  { key: "ytd", label: "YTD" },
  { key: "all", label: "All" },
];

export function MoneyHero({
  value,
  gain,
  ret,
  curve,
  range,
  basis,
  fallbackGain,
  fallbackPct,
}: {
  value: number;
  gain: number | null;
  ret: number | null;
  curve: DashboardView["curve"];
  range: RangeKey;
  /** Unrealised P&L, for when the window closed nothing. */
  fallbackGain: number | null;
  fallbackPct: number | null;
  /** What the curve is drawn on — the account, or the book. Stated, not implied. */
  basis: string | null;
}) {
  /*
   * The change, or the next-best true change.
   *
   * `gain` is the window's realised movement and it is null for an account
   * that has not closed anything in the window — which is most accounts, and
   * was this one. The line then rendered nothing at all, leaving a value with
   * no change under it: the one shape no brokerage home screen has, because
   * a number on its own does not answer the question the app was opened with.
   *
   * So it falls back to unrealised P&L, which is a real figure off the same
   * snapshot, and the label changes with it. A fallback wearing the original
   * heading would be a different measurement under the same word.
   */
  const shown = gain ?? fallbackGain;
  const shownPct = gain != null ? ret : fallbackPct;
  const over = gain != null ? rangeLabel(range) : "on what you hold";
  const up = (shown ?? 0) >= 0;

  return (
    <section className={styles.hero}>
      <p className={styles.eyebrow}>Total value</p>

      <p className={styles.value}>{money(value, 2)}</p>

      {/*
        The change, on one line, with the arrow doing the direction as well as
        the colour — the same rule the rest of this product runs on.
      */}
      {shown != null ? (
        <p className={styles.delta} data-dir={up ? "up" : "down"}>
          <span aria-hidden="true">{up ? "▲" : "▼"}</span>{" "}
          {up ? "+" : "−"}
          {money(Math.abs(shown))}
          {shownPct != null ? (
            <span className={styles.pct}> ({signedPct(shownPct * 100)})</span>
          ) : null}
          <span className={styles.since}> · {over}</span>
        </p>
      ) : null}

      {curve.length >= 2 ? (
        <div className={styles.chart}>
          <EquityCurve series={curve} tone={up ? "moss" : "signal"} />
        </div>
      ) : null}

      {/*
        The ranges. They were designed as links rather than state — a window is
        a place you can be sent to — and then never drawn anywhere, so the
        screen has been fixed at 45 days since it shipped.
      */}
      <nav className={styles.ranges} aria-label="Range">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={r.key === "45d" ? "/you" : `/you?range=${r.key}`}
            className={styles.range}
            aria-current={r.key === range ? "page" : undefined}
            scroll={false}
          >
            {r.label}
          </Link>
        ))}
      </nav>

      {basis ? <p className={styles.basis}>{basis}</p> : null}
    </section>
  );
}

function rangeLabel(range: RangeKey): string {
  return range === "ytd" ? "year to date" : range === "all" ? "all time" : "45 days";
}
