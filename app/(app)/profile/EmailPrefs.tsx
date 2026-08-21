"use client";

import { useState } from "react";
import { SEND_CADENCE } from "@/lib/email/schedule";
import styles from "./profile.module.css";

type Kind = "brief" | "recap";

/**
 * The only two switches that cause Supercruise to contact anyone.
 *
 * Both start off. The copy states what arrives and when, and says the thing
 * that matters most about it — two messages a week, and never a price. There is
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

  /*
   * The cadence in each label comes from `SEND_CADENCE`, which the cron reads
   * too — a settings screen that names a day the scheduler does not agree
   * with is a promise the product breaks every week.
   */
  const rows: Array<{ kind: Kind; label: string; note: string }> = [
    {
      kind: "brief",
      label: `${SEND_CADENCE.brief} brief`,
      note: "Where you stand going into the week: your score, what moved it, your streak, and anything still untagged. Never a price.",
    },
    {
      kind: "recap",
      label: `${SEND_CADENCE.recap} recap`,
      note: "The week once the market has closed it: scored days, green and red sessions, and what you actually realised.",
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
