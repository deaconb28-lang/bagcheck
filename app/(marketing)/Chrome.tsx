import Link from "next/link";
import { appLocked } from "@/lib/launch";
import { isAuthConfigured } from "@/auth";
import { GoogleSignIn } from "@/components/app/GoogleSignIn";
import { BagMark } from "./BagMark";
import styles from "./landing.module.css";

/*
 * The nav and the footer, once.
 *
 * They were written inline on the landing, which was fine while the landing
 * was the only marketing page. Pricing and the legal pages wear the same
 * chrome, and three copies of a nav is three places for the links to drift
 * apart.
 */

export function MarketingNav({ current }: { current?: "pricing" }) {
  /*
   * While the app is locked there is no Login link, because there is nothing
   * to log in to. When it is open the link posts the sign-in itself and comes
   * back at the dashboard — one click, not two.
   */
  const locked = appLocked();

  return (
    <header className={styles.nav}>
      <Link href="/" className={styles.brand}>
        <BagMark />
        <span className={styles.wordmark}>bagcheck</span>
      </Link>
      <nav className={styles.navLinks} aria-label="Sections">
        <Link href="/#deck">Wrapped</Link>
        <Link href="/#soon">The score</Link>
        <Link href="/pricing" aria-current={current === "pricing" ? "page" : undefined}>
          Pricing
        </Link>
        {!locked &&
          (isAuthConfigured() ? (
            <GoogleSignIn redirectTo="/home" className={styles.navSignIn}>
              Log in
            </GoogleSignIn>
          ) : (
            <Link href="/home">Login</Link>
          ))}
      </nav>
      <div className={styles.navActions}>
        <Link href="/start" className={styles.navCta}>
          Get started free
        </Link>
        <Link href="/#waitlist" className={styles.navGhost}>
          Join the waitlist
        </Link>
      </div>
    </header>
  );
}

export function MarketingFooter() {
  const locked = appLocked();

  return (
    <footer className={styles.foot}>
      <div className={styles.footInner}>
        <span className={styles.brand} data-foot="">
          <BagMark size={28} check="var(--mk-field)" />
          <span className={styles.wordmark} data-small="">
            bagcheck
          </span>
        </span>
        <div className={styles.footLinks}>
          <Link href="/pricing">Pricing</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/icons">Icon credits</Link>
          <Link href="/legal/photos">Photo credits</Link>
          {!locked &&
            (isAuthConfigured() ? (
              <GoogleSignIn redirectTo="/home" className={styles.navSignIn}>
                Log in
              </GoogleSignIn>
            ) : (
              <Link href="/home">Login</Link>
            ))}
        </div>
        <span className={styles.footNote}>© 2026 bagcheck</span>
      </div>
    </footer>
  );
}
