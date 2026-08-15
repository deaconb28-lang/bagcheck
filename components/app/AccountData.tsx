"use client";

import { useState } from "react";
import { Button, Eyebrow } from "@/components/primitives";
import styles from "./AccountData.module.css";

type Props = {
  /** What the reader is about to lose, so the confirmation names it. */
  footprint: { transactions: number; scores: number; cards: number; tags: number };
};

/**
 * Export and erasure, on the settings screen where they belong.
 *
 * Deletion is two deliberate steps rather than a dialog: the first press
 * states exactly what goes and what it costs, the second does it. There is no
 * countdown and no "are you sure?" — the confirmation carries the figures,
 * which is the only thing that actually helps someone decide.
 */
export function AccountData({ footprint }: Props) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function erase() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "That did not delete.");
        setBusy(false);
        return;
      }
      // The session rows are gone, so the cookie no longer resolves.
      window.location.href = "/";
    } catch {
      setError("That did not delete.");
      setBusy(false);
    }
  }

  return (
    <div className={styles.block}>
      <Eyebrow>Your data</Eyebrow>

      <p className={styles.body}>
        {footprint.transactions.toLocaleString("en-US")} transactions,{" "}
        {footprint.scores.toLocaleString("en-US")} scored days, {footprint.cards} minted{" "}
        {footprint.cards === 1 ? "card" : "cards"} and {footprint.tags} tagged{" "}
        {footprint.tags === 1 ? "entry" : "entries"} are stored against this account.
      </p>

      <div className={styles.actions}>
        <a className={styles.download} href="/api/account/export">
          Download everything as JSON
        </a>

        {armed ? (
          <div className={styles.confirm}>
            <p className={styles.warn}>
              This erases the ledger, every score, every tag and every minted card,
              and cancels a paid plan if one is running. Links to cards you have
              already posted stop resolving. It cannot be undone.
            </p>
            <div className={styles.confirmRow}>
              <Button onClick={erase}>{busy ? "Deleting…" : "Delete it all"}</Button>
              <button
                type="button"
                className={styles.cancel}
                onClick={() => setArmed(false)}
              >
                Keep my account
              </button>
            </div>
          </div>
        ) : (
          <button type="button" className={styles.danger} onClick={() => setArmed(true)}>
            Delete my account
          </button>
        )}
      </div>

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
