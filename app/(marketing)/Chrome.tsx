import Link from "next/link";
import { appLocked } from "@/lib/launch";
import { GoToApp } from "./GoToApp";
import { SupercruiseMark } from "@/components/brand/SupercruiseMark";
import styles from "./landing.module.css";

/*
 * The nav and the footer, once.
 *
 * They were written inline on the landing, which was fine while the landing
 * was the only marketing page. Pricing and the legal pages wear the same
 * chrome, and three copies of a nav is three places for the links to drift
 * apart.
 */

export async function MarketingNav({ current }: { current?: "pricing" }) {
  return (
    <header className={styles.nav}>
      <Link href="/" className={styles.brand}>
        <SupercruiseMark />
        <span className={styles.wordmark}>supercruise</span>
      </Link>
      <nav className={styles.navLinks} aria-label="Sections">
        <Link href="/#deck">Wrapped</Link>
        <Link href="/#soon">The score</Link>
        <Link href="/pricing" aria-current={current === "pricing" ? "page" : undefined}>
          Pricing
        </Link>
      </nav>
      <div className={styles.navActions}>
        {/*
          * "Go to app" took the Log in link's place rather than sitting beside
          * it. Two entries that both end at the same screen is one entry and a
          * synonym, and the nav is already tight at 1024 — "The score" wraps
          * to two lines there.
          */}
        <GoToApp variant="primary" />
        <Link href="/start" className={styles.navGhost}>
          Get started free
        </Link>
      </div>
    </header>
  );
}

export async function MarketingFooter() {
  const locked = appLocked();

  return (
    <footer className={styles.foot}>
      <div className={styles.footInner}>
        <span className={styles.brand} data-foot="">
          <SupercruiseMark size={28} />
          <span className={styles.wordmark} data-small="">
            supercruise
          </span>
        </span>
        <div className={styles.footLinks}>
          <Link href="/pricing">Pricing</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/icons">Icon credits</Link>
          <Link href="/legal/photos">Photo credits</Link>
          {!locked ? <Link href="/app">Go to app</Link> : null}
        </div>
        <span className={styles.footNote}>© 2026 supercruise</span>
      </div>
    </footer>
  );
}
