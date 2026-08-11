"use client";

import { useState } from "react";
import styles from "./start.module.css";

/**
 * The one action on the connect screen.
 *
 * It navigates to `/api/snaptrade/connect`, which mints a portal session and
 * redirects — a round trip that can take a couple of seconds, so the button
 * says what is happening rather than going quiet. Three states, three labels,
 * and the label always names the thing the button is doing.
 *
 * When the deployment has no SnapTrade credentials the button does not
 * pretend: it says so, and the screen offers the sample year instead of a
 * dead end.
 */
export function ConnectButton({ signedIn, ready }: { signedIn: boolean; ready: boolean }) {
  const [going, setGoing] = useState(false);

  if (!ready) {
    return (
      <div className={styles.actions}>
        <a className={styles.primary} href="/wrapped?demo=1">
          See a sample year
        </a>
        <p className={styles.warn}>
          Brokerage linking is not configured on this deployment yet. The sample
          year is built from an example ledger, and says so on every card.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.actions}>
      <a
        className={styles.primary}
        href={signedIn ? "/api/snaptrade/connect" : "/api/auth/signin?callbackUrl=/start"}
        onClick={() => setGoing(true)}
        aria-busy={going || undefined}
      >
        {going ? "Opening your broker…" : signedIn ? "Connect a brokerage" : "Continue with Google"}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h13" />
          <path d="M12 5l7 7-7 7" />
        </svg>
      </a>
      <a className={styles.secondary} href="/wrapped?demo=1">
        See a sample year first
      </a>
    </div>
  );
}
