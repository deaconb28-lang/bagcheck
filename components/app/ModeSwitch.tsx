"use client";

import { useEffect, useState } from "react";
import styles from "./ModeSwitch.module.css";

type Mode = "light" | "dark";
const KEY = "canopy-mode";

/**
 * Light or dark, from the rail.
 *
 * Light is the base — the app was dark-only, which made every screen a night
 * instrument whether or not anyone was reading it at night. Dark stays,
 * because a ledger at midnight is a real thing, but it is a preference rather
 * than the identity.
 *
 * The choice lands on `<html data-mode>` immediately and is remembered
 * locally, so it survives a reload without waiting on a round trip. Signed-in
 * readers also persist it to the account, best effort — a preference that
 * fails to save should not interrupt the person who set it.
 */
export function ModeSwitch() {
  const [mode, setMode] = useState<Mode>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem(KEY);
    const current = stored === "dark" || stored === "light" ? stored : null;
    if (current) {
      document.documentElement.dataset.mode = current;
      setMode(current);
      return;
    }
    const attr = document.documentElement.dataset.mode;
    if (attr === "dark" || attr === "light") setMode(attr);
  }, []);

  const flip = () => {
    const next: Mode = mode === "dark" ? "light" : "dark";
    setMode(next);
    document.documentElement.dataset.mode = next;
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      /* A blocked store is not a reason to refuse the change. */
    }
    void fetch("/api/prefs/mode", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ mode: next }),
    }).catch(() => {
      /* Best effort: the mode is already applied. */
    });
  };

  return (
    <button
      type="button"
      className={styles.switch}
      onClick={flip}
      title={mode === "dark" ? "Switch to light" : "Switch to dark"}
      aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {mode === "dark" ? <Sun /> : <Moon />}
    </button>
  );
}

function Moon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </svg>
  );
}

function Sun() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
    </svg>
  );
}
