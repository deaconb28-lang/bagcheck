"use client";

import { useEffect, useState } from "react";
import styles from "./AppRail.module.css";

/**
 * Light and dark, and which one the reader gets.
 *
 * The app was stamped dark permanently and the full light palette sat in
 * `:root` unselected. Both are real now, and the order of preference is the
 * one every well-behaved product uses: an explicit choice, then the system
 * preference, then dark.
 *
 * The button renders the *other* mode's name, because a control should say
 * what happens when it is used rather than what is currently true — "Light"
 * turns the lights on, and a switch labelled with its own current state is
 * the commonest way to make somebody click twice.
 *
 * It renders nothing until mounted. The mode is decided by an inline script
 * before first paint, so any state this component guessed on the server would
 * be a second, later, disagreeing answer.
 */
export function ModeSwitch() {
  const [mode, setMode] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const current = document.documentElement.dataset.mode;
    setMode(current === "light" ? "light" : "dark");
  }, []);

  if (!mode) return <span className={styles.item} aria-hidden="true" />;

  const next = mode === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      className={styles.item}
      title={next === "light" ? "Light" : "Dark"}
      onClick={() => {
        document.documentElement.dataset.mode = next;
        try {
          localStorage.setItem("sc-mode", next);
        } catch {
          /* A reader with storage blocked still gets the switch for this
             visit; only the memory of it is lost. */
        }
        setMode(next);
      }}
    >
      {/* Sun and moon, drawn here like every other glyph in this rail so it
          is on the first paint and takes currentColor. */}
      {next === "light" ? (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4.4" stroke="currentColor" strokeWidth="1.7" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <line
              key={deg}
              x1="12"
              y1="2.6"
              x2="12"
              y2="5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              transform={`rotate(${deg} 12 12)`}
            />
          ))}
        </svg>
      ) : (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20 14.2A8.4 8.4 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <span className={styles.sr}>Switch to {next} mode</span>
    </button>
  );
}
