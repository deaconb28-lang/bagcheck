"use client";

import { useState } from "react";
import styles from "./profile.module.css";

type Kind = "brief" | "recap";

/**
 * The only two switches that cause Supercruise to contact anyone.
 *
 * Both start off. The copy states what arrives and when, and says the thing
 * that matters most about it — one message a day, and never a price. There is
 * no third option here on purpose: if a fourth kind of message is ever worth
 * sending, it has to displace one of these rather than be added beside them.
 */
export function EmailPrefs({
  daily,
  weekly,
  configured,
}: {
  daily: boolean;
  weekly: boolean;
  /** Whether the deployment can send at all. */
  configured: boolean;
}) {
  const [state, setState] = useState({ brief: daily, recap: weekly });
  const [busy, setBusy] = useState<Kind | null>(null);

  async function toggle(kind: Kind) {
    if (busy) return;
    const on = !state[kind];
    setBusy(kind);
    setState((s) => ({ ...s, [kind]: on }));
    try {
      const res = await fetch("/api/prefs/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind, on }),
      });
      if (!res.ok) throw new Error(String(res.status));
    } catch {
      // Put the switch back where it was rather than leaving it showing a
      // setting the server does not hold.
      setState((s) => ({ ...s, [kind]: !on }));
    } finally {
      setBusy(null);
    }
  }

  const rows: Array<{ kind: Kind; label: string; note: string }> = [
    {
      kind: "brief",
      label: "Daily brief",
      note: "Your score, what moved it, and anything still untagged. One message a day, never a price.",
    },
    {
      kind: "recap",
      label: "Weekly recap",
      note: "Monday morning: the week's scored days, sessions and realised P&L. Replaces that day's brief.",
    },
  ];

  return (
    <div className={styles.emailRows}>
      {rows.map((row) => (
        <div key={row.kind} className={styles.emailRow}>
          <div className={styles.emailText}>
            <span className={styles.emailLabel}>{row.label}</span>
            <p className={styles.body}>{row.note}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={state[row.kind]}
            aria-label={row.label}
            className={styles.switch}
            disabled={!configured || busy === row.kind}
            onClick={() => toggle(row.kind)}
          >
            <span className={styles.knob} />
            <span className={styles.switchWord}>{state[row.kind] ? "On" : "Off"}</span>
          </button>
        </div>
      ))}
      {!configured ? (
        <p className={styles.body}>
          Email is not configured on this deployment, so nothing can be sent yet.
        </p>
      ) : null}
    </div>
  );
}
