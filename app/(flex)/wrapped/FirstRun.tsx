"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { spanLabel, stepsFrom } from "@/lib/snaptrade/progress";
import type { SyncProgress } from "@/lib/snaptrade/progress";
import styles from "./firstrun.module.css";

const POLL_MS = 900;

const IDLE: SyncProgress = {
  phase: "accounts",
  status: "running",
  error: null,
  accountsTotal: 0,
  accountsDone: 0,
  positions: 0,
  transactions: 0,
  earliestDate: null,
  elapsedMs: null,
};

/**
 * The moment after a brokerage connects.
 *
 * It greets by name, starts the sync, and reports it — and then the cards
 * appear underneath on the same screen, because a redirect to a second page
 * is where the old flow lost people entirely. The POST stays open for the
 * whole run, so progress comes from polling a board the sync writes as it
 * goes; **nothing here moves on a timer.** A meter that advanced on its own
 * would be inventing a fact about someone's own history, in the one place
 * they have no way to check it.
 *
 * The connect-once promise is made here rather than only on the screen
 * before, because this is the first moment it is true.
 */
export function FirstRun({ name }: { name: string }) {
  const [progress, setProgress] = useState<SyncProgress>(IDLE);
  const [failed, setFailed] = useState<string | null>(null);
  const started = useRef(false);
  const router = useRouter();

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/snaptrade/sync/progress", { cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as { progress: SyncProgress | null };
      if (body.progress) setProgress(body.progress);
    } catch {
      /* A dropped poll is not a failed sync — the next one carries the state. */
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const timer = setInterval(poll, POLL_MS);
    void poll();

    void (async () => {
      try {
        const res = await fetch("/api/snaptrade/sync", { method: "POST" });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setFailed(body?.error ?? `The read stopped with a ${res.status}.`);
          return;
        }
        await poll();
        /*
         * The cards are rendered on the server from what the sync just wrote,
         * so the page has to be asked again. Refreshing rather than navigating
         * keeps the reader on this screen, which is the whole point of it.
         */
        router.refresh();
      } catch (err) {
        setFailed(err instanceof Error ? err.message : String(err));
      } finally {
        clearInterval(timer);
      }
    })();

    return () => clearInterval(timer);
  }, [poll, router]);

  const steps = stepsFrom(failed ? { ...progress, status: "failed" } : progress);
  const done = progress.status === "done";
  const span = spanLabel(progress.earliestDate, new Date().toISOString().slice(0, 10));

  return (
    <section className={styles.run} aria-live="polite">
      <span className={styles.eyebrow}>Connected</span>
      <h1 className={styles.hello}>Hey {name}.</h1>
      <p className={styles.lede}>
        {done
          ? span
            ? `${span} of your own history is in. Your cards are below.`
            : "Your history is in. Your cards are below."
          : "Your brokerage is linked to this account — that was the only time you have to do it. Reading your history now."}
      </p>

      <ol className={styles.steps}>
        {steps.map((step) => (
          <li key={step.phase} className={styles.step} data-state={step.state}>
            <span className={styles.mark} aria-hidden="true" />
            <span className={styles.label}>{step.label}</span>
            <span className={styles.detail}>{step.detail}</span>
            <span className={styles.meter} aria-hidden="true">
              <i style={{ transform: `scaleX(${step.fraction})` }} />
            </span>
          </li>
        ))}
      </ol>

      {failed ? (
        <p className={styles.failed} role="status">
          {failed} Your brokerage is still linked — nothing needs connecting
          again. Reloading this page starts the read over.
        </p>
      ) : null}
    </section>
  );
}
