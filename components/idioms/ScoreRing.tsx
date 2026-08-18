"use client";

import { useEffect, useState } from "react";
import styles from "./ScoreRing.module.css";

type ScoreRingProps = {
  score: number;
  size?: number;
  label?: string;
  /**
   * Draw the arc alone.
   *
   * Where the screen already sets the score as its hero figure, the ring
   * printing it again is the same measurement twice, three inches apart. The
   * arc on its own is a dial: it says how far along the number is without
   * repeating what it is.
   */
  bare?: boolean;
  /**
   * What sits in the middle instead of the figure.
   *
   * Only read when `bare`. The hero puts the archetype's character here: the
   * arc says how far along the score is, the character says what the four
   * components add up to, and the numeral beside them says the number — three
   * readings of the same night, one object.
   */
  children?: React.ReactNode;
};

/**
 * The score, as an arc.
 *
 * Rendered at the full-circle offset and then transitioned to the real one in
 * an effect, so CSS does the sweep. The static state has to be correct if the
 * effect never runs — under reduced motion the offset is set immediately and
 * the transition is suppressed, so the ring is simply right.
 */
export function ScoreRing({
  score,
  size = 246,
  label = "Health",
  bare = false,
  children,
}: ScoreRingProps) {
  const stroke = Math.round(size * 0.053);
  const r = size / 2 - stroke / 2 - 8;
  const circumference = 2 * Math.PI * r;
  const [drawn, setDrawn] = useState(false);
  /*
   * The count-up. The real value is the default render — if the tween never
   * starts, the number on screen is still correct, and under reduced motion
   * it never starts.
   */
  const [shown, setShown] = useState(score);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDrawn(true);
      return;
    }
    const id = requestAnimationFrame(() => setDrawn(true));
    setShown(0);
    const started = performance.now();
    const tick = window.setInterval(() => {
      const t = Math.min(1, (performance.now() - started) / 850);
      const eased = 1 - (1 - t) ** 3;
      setShown(Math.round(score * eased));
      if (t >= 1) window.clearInterval(tick);
    }, 24);
    return () => {
      cancelAnimationFrame(id);
      window.clearInterval(tick);
    };
  }, [score]);

  const pct = Math.max(0, Math.min(100, score)) / 100;
  const offset = drawn ? circumference * (1 - pct) : circumference;

  return (
    <div className={styles.wrap} style={{ "--size": `${size}px` } as React.CSSProperties}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={styles.svg} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--ring-stroke, var(--moss))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference.toFixed(1)}
          strokeDashoffset={offset.toFixed(1)}
          className={styles.arc}
        />
      </svg>
      {bare ? (
        children ? <div className={styles.inner}>{children}</div> : null
      ) : (
        <div className={styles.inner}>
          <div className={`num ${styles.value}`} style={{ fontSize: Math.round(size * 0.358) }}>
            {shown}
          </div>
          <div className={styles.label}>{label}</div>
        </div>
      )}
    </div>
  );
}
