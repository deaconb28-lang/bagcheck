"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./public.module.css";

/**
 * Reserve a name, on the page that shows you what it will look like.
 *
 * It used to be a link to `/profile#ledger` — a tab that lands you in a
 * settings form, which is the thing this file's own note said a tab should
 * never do. The form is here now, under the card carrying the name, so typing
 * and seeing are the same act.
 *
 * **Reserving is not publishing.** The route keeps `handle` and `publicLedger`
 * as separate fields for exactly that reason, and this only ever writes the
 * first: picking a name must not put anybody's positions in front of a
 * stranger. Publishing stays a second, deliberate decision on `/profile`.
 */
export function ReserveHandle({ handle }: { handle: string | null }) {
  const router = useRouter();
  const [draft, setDraft] = useState(handle ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function claim(event: React.FormEvent) {
    event.preventDefault();
    const next = draft.trim().replace(/^@/, "");
    if (saving || !next || next === handle) return;
    setSaving(true);
    setMessage(null);
    setFailed(false);
    try {
      const res = await fetch("/api/profile/handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: next }),
      });
      const json = await res.json();
      if (!res.ok) {
        /* The route's own words: malformed, reserved and taken need different
           actions from the reader, and flattening them throws that away. */
        setMessage(json.error ?? "Could not save that handle.");
        setFailed(true);
        return;
      }
      setMessage(`@${json.handle} is yours.`);
      router.refresh();
    } catch {
      setMessage("Could not reach the server. Nothing was saved.");
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={claim}>
      <label className={styles.field}>
        <span className={styles.at} aria-hidden="true">
          @
        </span>
        <input
          className={styles.input}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="yourname"
          spellCheck={false}
          autoComplete="off"
          aria-label="Your handle"
          maxLength={20}
        />
      </label>
      <button className={styles.claim} type="submit" disabled={saving}>
        {saving ? "Reserving…" : handle ? "Change it" : "Reserve it"}
      </button>
      {message ? (
        <p className={styles.message} data-failed={failed || undefined} role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
