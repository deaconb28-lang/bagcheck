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
  /**
   * The week's move, as a pitch angle behind the dial.
   *
   * An attitude indicator is a ring with a horizon across it, and its whole
   * job is to say whether you are level and which way you are going. That is
   * already the shape this hero is drawn in — so the horizon is drawn, and
   * what tilts it is the **delta**, never the score.
   *
   * That distinction is the whole design. The arc already says how far along
   * the score is; a horizon encoding the score too would be the same
   * measurement twice, three inches apart, which is the failure `bare` exists
   * to prevent. The delta is a different fact.
   *
   * `null` or `0` draws a level horizon, and no value is invented for an
   * account with nothing to compare against — absent rather than defaulted,
   * like every other part of the read.
   */
  pitch?: number | null;
};

/**
 * How a delta becomes an angle: a floor, a slope and a ceiling.
 *
 * The floor is the part that came out of rendering it. **The horizon states a
 * direction, not a magnitude** — and a purely proportional tilt makes the most
 * common case, a delta of one or two points, geometrically invisible: at 1.5°
 * a reader cannot tell it from level, so the device says nothing at all on the
 * days it is most often asked to speak. Any non-zero delta therefore starts at
 * four degrees, which is the smallest tilt that reads as deliberate.
 *
 * The ceiling is the other half: a big week must not roll the dial over, and
 * past about twelve degrees the ladder stops reading as an instrument and
 * starts reading as a broken layout.
 */
const TILT_FLOOR = 4;
const DEG_PER_POINT = 1.1;
const MAX_TILT = 12;

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
  pitch = null,
}: ScoreRingProps) {
  const stroke = Math.round(size * 0.053);
  const r = size / 2 - stroke / 2 - 8;
  const circumference = 2 * Math.PI * r;
  /* Inside the stroke, with air — a horizon touching the arc reads as a seam. */
  const rin = r - stroke / 2 - Math.max(3, size * 0.018);
  const tilt =
    pitch == null || !Number.isFinite(pitch) || pitch === 0
      ? 0
      : Math.sign(pitch) *
        Math.min(MAX_TILT, TILT_FLOOR + Math.abs(pitch) * DEG_PER_POINT);
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

      {/*
        * The horizon, in its own layer.
        *
        * Not inside the arc's `<svg>`, because that element is rotated -90deg
        * so the arc can start at twelve o'clock — a horizon sharing it would
        * be drawn on its side. Two layers is cheaper than compensating for a
        * transform in every coordinate.
        */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className={styles.horizon}
        aria-hidden="true"
      >
        <defs>
          <clipPath id={`dial-${size}`}>
            <circle cx={size / 2} cy={size / 2} r={rin} />
          </clipPath>
        </defs>
        <g clipPath={`url(#dial-${size})`} transform={`rotate(${tilt.toFixed(2)} ${size / 2} ${size / 2})`}>
          <line
            x1={size / 2 - rin}
            x2={size / 2 + rin}
            y1={size / 2}
            y2={size / 2}
            className={styles.horizonLine}
          />
          {/* The pitch ladder: long, short, long, either side of the horizon. */}
          {[
            { at: 0.2, w: 0.17 },
            { at: 0.38, w: 0.1 },
            { at: 0.56, w: 0.17 },
          ].flatMap(({ at, w }) =>
            [-1, 1].map((dir) => (
              <line
                key={`${at}-${dir}`}
                x1={size / 2 - rin * w}
                x2={size / 2 + rin * w}
                y1={size / 2 + dir * rin * at}
                y2={size / 2 + dir * rin * at}
                className={styles.horizonTick}
              />
            )),
          )}
        </g>
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
