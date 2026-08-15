"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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
export function FirstRun({
  name,
  dashboardOpen,
}: {
  name: string;
  /**
   * Whether `/home` will actually open.
   *
   * `(flex)` sits outside the launch lock so a signed-out visitor can reach
   * it; `(app)` sits behind it. That asymmetry is deliberate and it means
   * this screen can be live while the door it offers is shut — which is
   * exactly the loop the flag's own documentation warns about: connect, sync,
   * press "Open your dashboard", land back on the marketing page with no
   * explanation. An affordance that will refuse you is absent, not present.
   */
  dashboardOpen: boolean;
}) {
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

  const run = useCallback(async () => {
    setFailed(null);
    const timer = setInterval(poll, POLL_MS);
    void poll();

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
  }, [poll, router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run();
  }, [run]);

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

      {/*
        * Where onboarding ends. The greeting and the first read happen here
        * because this is the screen the portal returns to, but the dashboard
        * is where the product lives — so the last step of setup is a door
        * into it rather than a screen the reader has to find their own way
        * off. It appears only once the read is done: an invitation to open a
        * dashboard that has nothing in it yet is a worse first visit than
        * waiting four seconds.
        */}
      {done && dashboardOpen ? (
        <Link className={styles.enter} href="/home">
          Open your dashboard
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h13" />
            <path d="M12 5l7 7-7 7" />
          </svg>
        </Link>
      ) : null}

      {/*
        * A failed read gets a way forward rather than an explanation and a
        * dead end. The brokerage is still linked, so the only thing that
        * failed is one attempt at reading it.
        */}
      {failed ? (
        <div className={styles.failedBlock} role="status">
          <p className={styles.failed}>
            {failed} Your brokerage is still linked — nothing needs connecting
            again.
          </p>
          <button type="button" className={styles.retry} onClick={() => void run()}>
            Try the read again
          </button>
        </div>
      ) : null}
    </section>
  );
}
