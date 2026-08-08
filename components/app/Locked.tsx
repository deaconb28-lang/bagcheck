import { TIER_LABEL, tierFor } from "@/lib/tiers";
import type { Capability, Readiness } from "@/lib/tiers";
import styles from "./Locked.module.css";

type LockedProps = {
  capability: Capability;
  /** What the tile is, in one mono line. */
  eyebrow: string;
  /**
   * Computed from real sample counts. A locked thing that says "Ready now"
   * when it is not would be the one lie in the whole monetization surface.
   */
  readiness?: Readiness | null;
  /** The unlocked twin, blurred in place. */
  children: React.ReactNode;
};

/**
 * A lock occupies the slot its unlocked twin would, blurred, with the tier
 * named. The user always sees the shape of what they are missing, and never
 * a modal wall in front of a screen they asked for.
 *
 * There is no share button inside a lock. The rule is that a locked card's
 * share affordance is absent, not disabled.
 */
export function Locked({ capability, eyebrow, readiness = null, children }: LockedProps) {
  const tier = tierFor(capability);

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.eyebrow}>{eyebrow}</span>
        <span className={styles.tier} data-tier={tier}>
          {TIER_LABEL[tier]}
        </span>
      </div>

      <div className={styles.blurred} aria-hidden="true">
        {children}
      </div>

      <div className={styles.foot}>
        {readiness ? (
          <span className={styles.ready} data-ready={readiness.ready || undefined}>
            {readiness.label}
          </span>
        ) : (
          <span className={styles.ready} />
        )}
        <a className={styles.unlock} href="/profile#plan">
          Unlock {TIER_LABEL[tier]}
        </a>
      </div>
    </div>
  );
}
