"use client";

import { useState } from "react";
import styles from "./marketing.module.css";

const PANELS = [
  {
    title: "What Bagcheck can see",
    body: "Every trade, transfer and position, all history, through one read-only SnapTrade connection. It cannot place, cancel or modify an order — permanently, not as a setting.",
  },
  {
    title: "What gets scored",
    body: "The part you control. Adherence to your own stated rules, consistency of sizing and cadence, patience through drawdowns, and exposure against the game you said you were playing.",
  },
  {
    title: "What you get in ninety seconds",
    body: "Years of history arrive at once, so your first screen is your own annual retrospective rather than an empty dashboard waiting to learn you.",
  },
];

/**
 * Three panels, the first open. The three facts that used to sit in a pill row
 * under the CTA now live in the first panel — which is where someone actually
 * looking for them will read them.
 */
export function Accordion() {
  const [open, setOpen] = useState(0);

  return (
    <div className={styles.accordion}>
      {PANELS.map((panel, i) => (
        <div key={panel.title} className={styles.panel}>
          <button
            type="button"
            className={styles.panelHead}
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? -1 : i)}
          >
            <span>{panel.title}</span>
            <span className={styles.chev} aria-hidden="true">
              <svg width="14" height="9" viewBox="0 0 14 9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 1.5 7 7.5l6-6" />
              </svg>
            </span>
          </button>
          <div className={styles.panelBody} data-open={open === i || undefined}>
            <p>{panel.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
