"use client";

import { useEffect, useState } from "react";
import { Eyebrow } from "./Eyebrow";
import styles from "./Stat.module.css";

type StatProps = {
  eyebrow: string;
  value: number | string;
  unit?: string;
  tone?: "ink" | "moss" | "signal";
  tail?: string;
};

/**
 * Grammar is fixed by prop order: eyebrow → value → unit → tail.
 * The eyebrow names the metric the number measures; the tail ships
 * a specific comparison.
 */
export function Stat({ eyebrow, value, unit, tone = "ink", tail }: StatProps) {
  const shown = useCountUp(value);
  return (
    <div className={styles.stat}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <div className={styles.val}>
        <span className={`num ${styles.n}`} data-tone={tone}>
          {shown}
        </span>
        {unit ? <span className={styles.u}>{unit}</span> : null}
      </div>
      {tail ? <div className={styles.tail}>{tail}</div> : null}
    </div>
  );
}

/*
 * The real value is the default render — server output and the first client
 * paint both show it, so the number is correct if the tween never starts.
 */
function useCountUp(value: number | string) {
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      setShown(value);
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(value);
      return;
    }
    const steps = 24; // ~430ms at 18ms/step, under the 500ms cap
    let i = 0;
    setShown(0);
    const t = setInterval(() => {
      i += 1;
      if (i >= steps) {
        setShown(value);
        clearInterval(t);
      } else {
        setShown(Math.round((value * i) / steps));
      }
    }, 18);
    return () => clearInterval(t);
  }, [value]);

  return shown;
}
