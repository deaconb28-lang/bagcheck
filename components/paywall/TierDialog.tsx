"use client";

import { useEffect } from "react";
import { TIER_LABEL, TIER_PRICE } from "@/lib/tiers";
import type { Tier } from "@/lib/tiers";
import styles from "./TierDialog.module.css";

const COLUMNS: Array<{ tier: Tier; who: string; lines: string[] }> = [
  {
    tier: "free",
    who: "Anyone with a brokerage",
    lines: [
      "The Health score and what moved it",
      "Streaks, Wrapped and event segments",
      "Every card your conduct earns, at full quality",
      "Sharing, always",
    ],
  },
  {
    tier: "plus",
    who: "People who write about investing",
    lines: [
      "Correlation cards and report carousels",
      "Publication exports, embeds and 4x transparent",
      "A live score badge",
      "Event segments and percentiles",
    ],
  },
  {
    tier: "trader",
    who: "Active day and swing traders",
    lines: [
      "Everything in Plus",
      "Daily session recap cards",
      "Setup and tag performance",
      "Motion exports, verified profile, custom handle",
    ],
  },
];

/**
 * The one paywall dialog, opened from any lock.
 *
 * "Rarity is earned. Range is bought." is the whole argument: paying widens
 * what the product will render for you and never touches what your conduct
 * is worth. No countdown, no discount banner, no trial nag.
 */
export function TierDialog({ current, onClose }: { current: Tier; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className={styles.scrim} role="dialog" aria-modal="true" aria-label="Plans" onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <h2 className={`disp ${styles.title}`}>Rarity is earned. Range is bought.</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className={styles.cols}>
          {COLUMNS.map((col) => (
            <div key={col.tier} className={styles.col} data-current={col.tier === current || undefined}>
              <span className={styles.tierName}>{TIER_LABEL[col.tier]}</span>
              <div className={`num ${styles.price}`}>
                ${TIER_PRICE[col.tier].monthly}
                {col.tier !== "free" ? <span className={styles.unit}>/mo</span> : null}
              </div>
              <span className={styles.who}>{col.who}</span>
              <ul className={styles.lines}>
                {col.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {col.tier === current ? (
                <span className={styles.currentChip}>Your plan</span>
              ) : col.tier === "free" ? null : (
                <a className={styles.cta} href={`/api/billing/checkout?tier=${col.tier}`}>
                  Upgrade to {TIER_LABEL[col.tier]}
                </a>
              )}
            </div>
          ))}
        </div>

        <p className={styles.note}>
          Paying unlocks categories and formats. It never unlocks a card — your
          conduct does that, and a Free account posts every card it earns.
        </p>
      </div>
    </div>
  );
}
