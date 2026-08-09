import Link from "next/link";
import { TIER_LABEL } from "@/lib/tiers";
import type { Tier } from "@/lib/tiers";
import styles from "./ScreenHeader.module.css";

export type ScreenHeaderProps = {
  /** Conversational, not a label. */
  title: string;
  /** Machine facts. Mono, one line, truncates. */
  meta: string;
  /** The Health score, so the number never leaves the screen. */
  score: number | null;
  /** Signed weekly delta, when there is one. */
  delta?: number | null;
  /** "06:14", or null when the ledger has never synced. */
  syncedAt?: string | null;
  /** Investor Age — how old the conduct reads. Null before a first score. */
  age?: number | null;
  tier: Tier;
};

/**
 * The sticky header, on every route.
 *
 * The score rides here because the product's subject is one number and it
 * should never require a navigation to see. The upgrade button is the only
 * commerce action in the app, and it is moss-filled because commerce is a
 * marketing surface even when it appears in-product.
 */
export function ScreenHeader({
  title,
  meta,
  score,
  delta = null,
  syncedAt = null,
  age = null,
  tier,
}: ScreenHeaderProps) {
  return (
    <header className={styles.head}>
      <div className={styles.text}>
        <div className={`disp ${styles.title}`}>{title}</div>
        <div className={styles.meta}>{meta}</div>
      </div>

      <div className={styles.spacer} />

      {score != null ? (
        <Link href="/home" className={styles.scorePill} title="Health — open Home">
          <span className={styles.scoreDot}>{score}</span>
          <span className={styles.scoreLabel}>
            Health{delta != null && delta !== 0 ? ` ${delta > 0 ? "+" : "−"}${Math.abs(delta)}` : ""}
          </span>
        </Link>
      ) : null}

      {/*
        * Violet, because the age is Bagcheck's own reading of the conduct —
        * the same reserved voice as the insight and the nightly score.
        */}
      {age != null ? (
        <Link href="/dna" className={styles.agePill} title="Investor Age — how old your conduct reads. Open DNA.">
          <span className={styles.ageNum}>{age}</span>
          <span className={styles.ageLabel}>Investor age</span>
        </Link>
      ) : null}

      <div className={styles.sync}>
        <span className={styles.syncDot} aria-hidden="true" />
        <span>{syncedAt ? `Synced ${syncedAt}` : "Never synced"}</span>
      </div>

      <div className={styles.tier}>{TIER_LABEL[tier]}</div>

      {tier !== "trader" ? (
        <Link href="/profile#plan" className={styles.upgrade}>
          {tier === "free" ? "Unlock Plus" : "Unlock Trader"}
        </Link>
      ) : null}
    </header>
  );
}
