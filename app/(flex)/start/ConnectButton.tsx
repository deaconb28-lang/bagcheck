"use client";

import { useState } from "react";
import styles from "./start.module.css";

/**
 * Linking a brokerage, for someone who is already signed in.
 *
 * It navigates to `/api/snaptrade/connect`, which mints a portal session and
 * redirects — a round trip that takes a couple of seconds, so the button says
 * what is happening rather than going quiet.
 *
 * Signing in is not this component's job: it is a server action, so the page
 * renders that instead when there is nobody to link an account to.
 */
export function ConnectButton() {
  const [going, setGoing] = useState(false);

  return (
    <a
      className={styles.primary}
      href="/api/snaptrade/connect"
      onClick={() => setGoing(true)}
      aria-busy={going || undefined}
    >
      {going ? "Opening your broker…" : "Connect a brokerage"}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12h13" />
        <path d="M12 5l7 7-7 7" />
      </svg>
    </a>
  );
}
