"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./profile.module.css";

/**
 * The public ledger: claim a name, then decide whether it answers.
 *
 * Two controls rather than one, because the data model deliberately separates
 * them. Reserving `@deacon` and deciding to be readable by strangers are
 * different decisions, and a single switch would publish somebody the moment
 * they picked a name.
 *
 * The toggle is disabled until a handle exists — there is nothing to publish
 * at an address that does not exist yet, and a switch that silently does
 * nothing is worse than one that says why it cannot.
 *
 * The guarantee is stated in prose beside the switch rather than left to the
 * privacy page. Someone deciding whether to publish needs to know exactly what
 * a stranger sees, at the moment they decide.
 */
export function PublicLedger({
  handle,
  published,
}: {
  handle: string | null;
  published: boolean;
}) {
  const router = useRouter();
  const [claimed, setClaimed] = useState(handle);
  const [draft, setDraft] = useState(handle ?? "");
  const [on, setOn] = useState(published);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function claim(event: React.FormEvent) {
    event.preventDefault();
    if (saving || !draft.trim() || draft.trim() === claimed) return;
    setSaving(true);
    setMessage(null);
    setFailed(false);
    try {
      const res = await fetch("/api/profile/handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: draft }),
      });
      const json = await res.json();
      if (!res.ok) {
        /*
         * The route's own words. It distinguishes a malformed handle from a
         * reserved one from a taken one, and each needs a different action
         * from the reader — flattening them to "that did not work" would
         * throw away the only useful part of the answer.
         */
        setMessage(json.error ?? "Could not save that handle.");
        setFailed(true);
        return;
      }
      setClaimed(json.handle);
      setDraft(json.handle ?? "");
      setMessage(`Claimed. Your ledger lives at /@${json.handle}.`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
      setFailed(true);
    } finally {
      setSaving(false);
    }
  }

  async function publish() {
    if (busy || !claimed) return;
    const next = !on;
    setBusy(true);
    setOn(next);
    try {
      const res = await fetch("/api/profile/handle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicLedger: next }),
      });
      if (!res.ok) throw new Error(String(res.status));
      router.refresh();
    } catch {
      /* Back where it was, rather than showing a state the server does not hold. */
      setOn(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.block}>
      <form className={styles.handleForm} onSubmit={claim} noValidate>
        <label className={styles.handleLabel} htmlFor="handle">
          Your handle
        </label>
        <div className={styles.handleRow}>
          <span className={styles.handleAt} aria-hidden="true">
            @
          </span>
          <input
            id="handle"
            className={styles.handleInput}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              /* A new keystroke is a new attempt, not the old failure. */
              if (failed) {
                setFailed(false);
                setMessage(null);
              }
            }}
            placeholder="yourname"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={failed || undefined}
            aria-describedby={message ? "handle-message" : undefined}
            maxLength={20}
          />
          <button
            type="submit"
            className={styles.handleButton}
            disabled={saving || !draft.trim() || draft.trim() === claimed}
          >
            {saving ? "Saving" : claimed ? "Change" : "Claim"}
          </button>
        </div>
        <p className={styles.note}>
          Three to twenty characters — lowercase letters, digits and underscore.
        </p>
        {message ? (
          <p
            id="handle-message"
            className={failed ? styles.handleProblem : styles.note}
            role={failed ? "alert" : undefined}
          >
            {message}
          </p>
        ) : null}
      </form>

      <div className={styles.emailRow}>
        <div className={styles.emailText}>
          <span className={styles.emailLabel}>Publish it</span>
          <p className={styles.body}>
            {claimed
              ? "Anyone with the link can read it. Weights and returns only — no balances, no trades, no dates, and nothing about what you did or when."
              : "Claim a handle first. There is nothing to publish at an address that does not exist yet."}
          </p>
          {claimed && on ? (
            <a className={styles.handleLink} href={`/@${claimed}`}>
              See what a stranger sees →
            </a>
          ) : null}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Publish your ledger"
          className={styles.switch}
          disabled={!claimed || busy}
          onClick={publish}
        >
          <span className={styles.knob} />
          <span className={styles.switchWord}>{on ? "On" : "Off"}</span>
        </button>
      </div>
    </div>
  );
}
