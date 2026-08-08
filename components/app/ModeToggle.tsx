"use client";

import { useEffect, useState } from "react";
import styles from "./ModeToggle.module.css";

type Mode = "light" | "dark";

/**
 * The mode switch, at the foot of the rail.
 *
 * The choice is persisted on the user document rather than in localStorage,
 * so it follows the reader to another device instead of being a property of
 * one browser. The write is fire-and-forget: a failed save must not block the
 * flip, because the flip is the thing the user asked for.
 */
export function ModeToggle({ mode: initial = "light" }: { mode?: Mode }) {
  const [mode, setMode] = useState<Mode>(initial);

  useEffect(() => {
    const current = document.documentElement.dataset.mode;
    if (current === "light" || current === "dark") setMode(current);
  }, []);

  const flip = () => {
    const next: Mode = mode === "dark" ? "light" : "dark";
    setMode(next);
    document.documentElement.dataset.mode = next;
    void fetch("/api/prefs/mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: next }),
    }).catch(() => {});
  };

  return (
    <button
      type="button"
      onClick={flip}
      className={styles.toggle}
      title={mode === "dark" ? "Switch to light" : "Switch to dark"}
      aria-label={mode === "dark" ? "Switch to light" : "Switch to dark"}
    >
      {mode === "dark" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.2 14.4A8.6 8.6 0 0 1 9.6 3.8a8.6 8.6 0 1 0 10.6 10.6z" />
        </svg>
      )}
    </button>
  );
}
