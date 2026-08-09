import type { Metadata } from "next";
import Link from "next/link";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Bagcheck — fitness tracking for your investment portfolio",
  description:
    "Bagcheck reads your brokerage history — read-only, permanently — and scores the part you control. See what your habits are worth, in realised P&L.",
};

/**
 * The landing, reduced to the claim. No artwork, no sections to scroll —
 * the product is the demonstration, and it is one tap away. Oversized type
 * and negative space carry what the aurora used to.
 */
export default function LandingPage() {
  return (
    <main className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.mark}>
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <circle
              cx="12"
              cy="12"
              r="9.4"
              fill="none"
              stroke="currentColor"
              strokeOpacity=".24"
              strokeWidth="2.6"
            />
            <path
              d="M12 2.6a9.4 9.4 0 0 1 8.1 14.1"
              fill="none"
              stroke="var(--moss)"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </svg>
          <span className={styles.wordmark}>Bagcheck</span>
        </div>
        <Link href="/home" className={styles.navCta}>
          Sign in
        </Link>
      </header>

      <section className={styles.hero}>
        <h1 className={`disp ${styles.headline}`}>
          Your habits have a P&amp;L.
        </h1>
        <p className={styles.lede}>
          Bagcheck reads your brokerage history — read-only, permanently — and
          scores the part you control: hold time, sizing, drawdown behaviour,
          consistency. Then it shows you what each habit actually returned, in
          realised dollars. First report in about ninety seconds.
        </p>
        <div className={styles.actions}>
          <Link href="/home" className={styles.cta}>
            Open Bagcheck
          </Link>
        </div>
        <p className={styles.trust}>
          Read-only via SnapTrade · no manual entry · never a price alert
        </p>
      </section>

      <footer className={styles.foot}>
        <span>Bagcheck</span>
        <Link href="/legal/icons">Icon credits</Link>
      </footer>
    </main>
  );
}
