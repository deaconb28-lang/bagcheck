"use client";

import { useState } from "react";
import styles from "./landing.module.css";

/**
 * The waitlist capture. One field, one button, and the button always says
 * what happened — never a toast that vanishes before it is read.
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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "busy" || state === "done") return;
    setState("busy");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, tier }),
      });
      setState(res.ok ? "done" : "failed");
    } catch {
      setState("failed");
    }
  }

  return (
    <form className={styles.waitForm} onSubmit={submit}>
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
        disabled={state === "done"}
      />
      <button type="submit" className={styles.waitButton} data-done={state === "done" || undefined}>
        {state === "done"
          ? "You are on the list"
          : state === "busy"
            ? "Joining…"
            : state === "failed"
              ? "Try again"
              : cta}
      </button>
    </form>
  );
}
