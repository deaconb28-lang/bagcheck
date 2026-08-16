import Link from "next/link";
import styles from "./cards.module.css";

/**
 * The artefact card, the insight row, and the locked tile.
 *
 * The locked tile is the piece that matters most here. Several figures the
 * design calls for — a peer percentile, how many investors you are ranked
 * against, how many views a shared card got — have no source in this product
 * and cannot be computed from a brokerage. They are not faked and they are not
 * silently dropped: the slot its unlocked twin would occupy is drawn, with the
 * condition that would fill it stated plainly and a button to be told when it
 * does. A plausible number under a blur is the one thing this product must
 * never print.
 */

/* ── The Wrapped promo ──────────────────────────────────────────────────── */

export function WrappedPromo({
  year,
  headline,
  sub,
  pills,
  ready,
}: {
  year: string;
  /** The figure, already formatted. */
  headline: string;
  sub: string;
  pills: string[];
  ready: boolean;
}) {
  return (
    <div className={styles.promo} data-reveal>
      <span className={styles.promoOrb} aria-hidden="true" />
      <div className={styles.promoBody}>
        <div className={styles.promoTop}>
          <span className={styles.promoLabel}>{year} Wrapped</span>
          <span className={styles.promoState}>{ready ? "Ready" : "Filling in"}</span>
        </div>

        <div className={`num ${styles.promoFigure}`}>{headline}</div>
        <div className={styles.promoSub}>{sub}</div>

        {pills.length ? (
          <div className={styles.promoPills}>
            {pills.map((pill, i) => (
              <span key={pill} className={styles.promoPill} data-solid={i === 0 || undefined}>
                {pill}
              </span>
            ))}
          </div>
        ) : null}

        <div className={styles.promoSpacer} />

        <div className={styles.promoActions}>
          <Link href="/wrapped" className={styles.promoGhost}>
            <Refresh />
            Replay
          </Link>
          <Link href="/wrapped" className={styles.promoSolid}>
            <Upload />
            Open your year
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── An insight row ─────────────────────────────────────────────────────── */

export function InsightRow({
  thumb,
  title,
  body,
  range,
  delay,
}: {
  thumb: React.ReactNode;
  title: string;
  body: string;
  range: string;
  delay: number;
}) {
  return (
    <div className={styles.insight} style={{ animationDelay: `${delay}ms` }}>
      <div className={styles.insightThumb}>{thumb}</div>
      <div className={styles.insightText}>
        <div className={styles.insightTitle}>{title}</div>
        <p className={styles.insightBody}>{body}</p>
      </div>
      <span className={styles.insightRange}>{range}</span>
    </div>
  );
}

/* ── The locked tile ────────────────────────────────────────────────────── */

/**
 * What is behind the gate, drawn — never a number.
 *
 * A teaser with a plausible figure on it would undermine every real figure
 * beside it, on the screen whose whole claim is that its numbers came off a
 * brokerage. So each drawing is shapes: a distribution with a marker, a ring
 * with a gap, a set of fanned cards. `--teaser-lit` is the one lit colour and
 * the caller sets it.
 */
export function LockedCard({
  eyebrow,
  title,
  body,
  requires,
  teaser,
  lit = "var(--accent)",
}: {
  eyebrow: string;
  title: string;
  body: string;
  /** The one condition that would fill this in. Never a date. */
  requires: string;
  teaser: React.ReactNode;
  lit?: string;
}) {
  return (
    <section
      className={styles.locked}
      data-reveal
      style={{ "--teaser-lit": lit } as React.CSSProperties}
    >
      <div className={styles.lockedHead}>
        <span className={styles.lockedEyebrow}>{eyebrow}</span>
        <span className={styles.lockedTag}>Not yet</span>
      </div>

      <div className={styles.lockedArt} aria-hidden="true">
        {teaser}
      </div>

      <h3 className={styles.lockedTitle}>{title}</h3>
      <p className={styles.lockedBody}>{body}</p>

      <div className={styles.lockedSpacer} />

      <div className={styles.lockedFoot}>
        <span className={styles.lockedNeeds}>{requires}</span>
        <Link href="/profile" className={styles.lockedGo}>
          Tell me when it lands
        </Link>
      </div>
    </section>
  );
}

/** A distribution with a marker on it. Shapes, no numerals. */
export function TeaserDistribution() {
  return (
    <svg viewBox="0 0 200 64" className={styles.teaser} aria-hidden="true">
      {[8, 14, 22, 32, 44, 52, 44, 32, 22, 14, 8].map((h, i) => (
        <rect
          key={i}
          x={4 + i * 18}
          y={58 - h}
          width="12"
          height={h}
          rx="3"
          fill="currentColor"
          opacity={0.22}
        />
      ))}
      <rect x="148" y="2" width="3" height="60" rx="1.5" fill="var(--teaser-lit)" />
    </svg>
  );
}

/** A ring with a gap in it. */
export function TeaserRing() {
  return (
    <svg viewBox="0 0 64 64" className={styles.teaserRing} aria-hidden="true">
      <circle cx="32" cy="32" r="24" fill="none" stroke="currentColor" strokeWidth="7" opacity={0.2} />
      <circle
        cx="32"
        cy="32"
        r="24"
        fill="none"
        stroke="var(--teaser-lit)"
        strokeWidth="7"
        strokeLinecap="round"
        pathLength={100}
        strokeDasharray="62 38"
        transform="rotate(-90 32 32)"
      />
    </svg>
  );
}

/** A fanned set of cards. */
export function TeaserDeck() {
  return (
    <svg viewBox="0 0 200 64" className={styles.teaser} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={62 + i * 20}
          y={8 + i * 4}
          width="46"
          height={48 - i * 8}
          rx="7"
          fill="currentColor"
          opacity={0.16 + i * 0.06}
        />
      ))}
      <rect x="42" y="6" width="46" height="52" rx="7" fill="var(--teaser-lit)" opacity={0.85} />
    </svg>
  );
}

function Refresh() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 4v7h-7" />
    </svg>
  );
}

function Upload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}
