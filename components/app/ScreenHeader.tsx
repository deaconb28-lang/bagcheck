import Link from "next/link";
import { SyncNow } from "./SyncNow";
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
  /** How long ago the ledger was read — "2h ago". Null if it never was. */
  syncedAt?: string | null;
  /** Investor Age — how old the conduct reads. Null before a first score. */
  age?: number | null;
  /** Consecutive sessions inside the rules. Hidden at 0 or unknown. */
  streak?: number | null;
  /**
   * What the engine currently has on file: how many patterns are speaking
   * and the worst one's realised dollars. The single most actionable number
   * in the product, so it rides the chrome. Null when nothing has cleared a
   * floor — the pill is absent, never a zero.
   */
  leak?: { count: number; worst: number | null } | null;
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
  streak = null,
  leak = null,
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

      {streak != null && streak > 0 ? (
        <div className={styles.streakPill} title="Consecutive sessions inside your rules">
          <span className={styles.streakNum}>{streak}</span>
          <span className={styles.ageLabel}>day streak</span>
        </div>
      ) : null}

      {/* The engine's read, denominated in dollars — why the app pays rent. */}
      {leak && leak.count > 0 ? (
        <Link
          href="/patterns"
          className={styles.leakPill}
          title="Patterns the engine has on file — open Patterns"
        >
          <span className={styles.leakNum}>{leak.count}</span>
          <span className={styles.ageLabel}>
            {leak.count === 1 ? "pattern" : "patterns"}
            {leak.worst != null && leak.worst < 0
              ? ` · −$${Math.abs(Math.round(leak.worst)).toLocaleString("en-US")}`
              : ""}
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

      {/*
        * The pill reads the brokerage again when pressed. Until it did, the
        * only way to run a sync was to reconnect or find /debug — so a
        * reader whose screen looked stale had nothing to press.
        */}
      <SyncNow syncedAt={syncedAt} />

      <div className={styles.tier}>{TIER_LABEL[tier]}</div>

      {tier === "free" ? (
        <Link href="/pricing" className={styles.upgrade}>
          Go Pro
        </Link>
      ) : null}
    </header>
  );
}
