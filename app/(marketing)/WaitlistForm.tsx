"use client";

import { useState } from "react";
import styles from "./landing.module.css";

/**
 * The waitlist capture.
 *
 * On success the form is *replaced* rather than relabelled. A button that
 * changes its own text is the weakest confirmation there is — it is the
 * thing that was just clicked, so it reads as a state of the button rather
 * than as an answer, and on a phone the thumb is usually covering it. What
 * takes its place says three things: that it worked, the address it worked
 * for, and what happens next. Nothing here disappears on a timer.
 *
 * The message distinguishes joining from being on the list already, because
 * someone submitting twice is asking whether the first one took, and telling
 * them "you're on the list" again does not answer that.
 */
export function WaitlistForm({
  tier = "waitlist",
  cta = "Join the waitlist",
}: {
  tier?: "waitlist" | "early" | "premium";
  cta?: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "failed">("idle");
  const [joined, setJoined] = useState(true);
  const [problem, setProblem] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "busy" || state === "done") return;
    setState("busy");
    setProblem(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tier }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok) {
        setJoined(body.joined !== false);
        setState("done");
        return;
      }
      /* Say what went wrong. "Something went wrong" is not a reason. */
      setProblem(
        res.status === 422
          ? "That address does not look right — check it and try again."
          : res.status === 503
            ? "Signups are not open on this deployment yet."
            : "That did not save. Try again in a moment.",
      );
      setState("failed");
    } catch {
      setProblem("No connection. Check your network and try again.");
      setState("failed");
    }
  }

  if (state === "done") {
    return (
      <div className={styles.waitDone} role="status">
        <span className={styles.waitTick} aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12.5l5 5L20 6.5" />
          </svg>
        </span>
        <div className={styles.waitDoneText}>
          <b>{joined ? "You're on the list." : "You're already on the list."}</b>
          <span>
            {joined ? "We'll email " : "We have "}
            <i>{email}</i>
            {joined ? " when your spot opens. Nothing else." : " on file — no need to sign up twice."}
          </span>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.waitForm} onSubmit={submit} noValidate>
      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (state === "failed") setState("idle");
        }}
        className={styles.waitInput}
        aria-label="Email address"
        aria-invalid={state === "failed" || undefined}
      />
      <button type="submit" className={styles.waitButton} disabled={state === "busy"}>
        {state === "busy" ? "Joining…" : state === "failed" ? "Try again" : cta}
      </button>
      {problem ? (
        <p className={styles.waitProblem} role="alert">
          {problem}
        </p>
      ) : null}
    </form>
  );
}
