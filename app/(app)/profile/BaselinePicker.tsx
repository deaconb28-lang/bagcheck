"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StyleBaseline } from "@/lib/score";
import styles from "./profile.module.css";

const OPTIONS: Array<{ value: StyleBaseline; label: string; detail: string }> = [
  { value: "long-term", label: "Long-term", detail: "Buy and hold, contributions on a schedule" },
  { value: "swing", label: "Swing", detail: "Positions held days to weeks" },
  { value: "active", label: "Active", detail: "Intraday and multi-trade sessions" },
];

type BaselinePickerProps = {
  current: StyleBaseline;
  /** False until a brokerage is connected — the API rejects it otherwise. */
  canSet: boolean;
};

export function BaselinePicker({ current, canSet }: BaselinePickerProps) {
  const [selected, setSelected] = useState<StyleBaseline>(current);
  const [saving, setSaving] = useState<StyleBaseline | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function choose(baseline: StyleBaseline) {
    if (saving || baseline === selected) return;
    setSaving(baseline);
    setMessage(null);
    try {
      const res = await fetch("/api/profile/baseline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseline }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage(json.error ?? "Could not save that baseline.");
        return;
      }
      setSelected(baseline);
      setMessage(`Saved. Your score recomputed to ${json.score}.`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className={styles.picker}>
      <div className={styles.options} role="group" aria-label="Style baseline">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={styles.option}
            data-selected={option.value === selected || undefined}
            aria-pressed={option.value === selected}
            disabled={!canSet || saving !== null}
            onClick={() => choose(option.value)}
          >
            <span className={styles.optionLabel}>{option.label}</span>
            <span className={styles.optionDetail}>{option.detail}</span>
            {saving === option.value ? (
              <span className={styles.optionState}>Saving…</span>
            ) : null}
          </button>
        ))}
      </div>
      {!canSet ? (
        <p className={styles.pickerNote}>
          Connect a brokerage first — the baseline is what your history gets
          measured against.
        </p>
      ) : null}
      {message ? <p className={styles.pickerNote}>{message}</p> : null}
    </div>
  );
}
