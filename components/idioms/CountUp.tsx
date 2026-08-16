"use client";

import { useEffect, useState } from "react";

export type CountKind = "money" | "signedMoney" | "pct" | "int";

/**
 * A figure that arrives by counting.
 *
 * **The real value is the default render.** The initial state is the finished
 * number, formatted exactly as it will end — so if the effect never runs, if
 * JavaScript never lands, if the reader has asked for less motion, the figure
 * on screen is still correct. A count-up that owns the truth is a count-up
 * that can print a wrong number, and this product cannot print a wrong number.
 *
 * The tween therefore runs *backwards into place*: on mount it drops to the
 * start and walks up. That inversion is the whole trick — the correct value is
 * never something the animation has to arrive at to become true.
 *
 * Formatting lives here rather than in a passed function, because a function
 * cannot cross the server boundary and a formatter that lives on both sides is
 * two formatters waiting to disagree.
 */
export function CountUp({
  value,
  kind = "int",
  duration = 900,
}: {
  value: number;
  kind?: CountKind;
  /** Arrivals stay short; this is the outer bound for the largest figure. */
  duration?: number;
}) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    /*
     * Land on the truth first, on every path out of here.
     *
     * `shown` is state, so it survives a re-render — and `SyncNow` calls
     * `router.refresh()`, which re-renders this screen in place with a new
     * ledger. Returning early without this left a reader who has asked for
     * reduced motion looking at their pre-sync figure while every sentence,
     * row and provenance line beside it had moved on. A count-up may decline
     * to animate; it may never decline to be correct.
     */
    setShown(value);
    if (!Number.isFinite(value) || value === 0) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const started = performance.now();
    setShown(0);

    const id = window.setInterval(() => {
      const t = Math.min((performance.now() - started) / duration, 1);
      /* Ease-out: fast off the line, settling rather than braking. */
      const eased = 1 - (1 - t) ** 3;
      setShown(value * eased);
      if (t >= 1) window.clearInterval(id);
    }, 1000 / 60);

    return () => window.clearInterval(id);
  }, [value, duration]);

  return <>{format(shown, kind, value)}</>;
}

/**
 * The tween's frames are formatted like the destination, never more precisely
 * — a figure that gains and loses decimals as it counts reads as a glitch.
 */
function format(shown: number, kind: CountKind, target: number): string {
  switch (kind) {
    case "money":
      return money(shown);
    case "signedMoney":
      return `${target >= 0 ? "+" : "−"}${money(Math.abs(shown))}`;
    case "pct":
      return `${target >= 0 ? "+" : "−"}${Math.abs(shown).toFixed(1)}%`;
    default:
      return Math.round(shown).toLocaleString("en-US");
  }
}

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
