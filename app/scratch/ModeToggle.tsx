"use client";

import { useState } from "react";
import styles from "./ModeToggle.module.css";

const MODES = ["dark", "light"] as const;
type Mode = (typeof MODES)[number];

export function ModeToggle() {
  const [mode, setMode] = useState<Mode>("dark");

  const set = (m: Mode) => {
    setMode(m);
    document.documentElement.dataset.mode = m;
  };

  return (
    <div className={styles.toggle} role="group" aria-label="Mode">
      {MODES.map((m) => (
        <button key={m} aria-pressed={mode === m} onClick={() => set(m)}>
          {m === "dark" ? "Dark" : "Light"}
        </button>
      ))}
    </div>
  );
}
