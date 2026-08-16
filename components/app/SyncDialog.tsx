"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/primitives";
import { arrivalLine, stepsFrom } from "@/lib/snaptrade/progress";
import type { SyncProgress } from "@/lib/snaptrade/progress";
import styles from "./SyncDialog.module.css";

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
 * The first screen after a brokerage connects.
 *
 * It starts the sync and then reports it — the POST stays open for the whole
 * run, so progress comes from polling a status board the sync writes as it
 * goes rather than from anything this component can infer. **Nothing here
 * moves on a timer.** A meter that advanced on its own would be inventing a
 * fact about someone's own history, in the one place they have no way to
 * check it.
 *
 * The closing line is the payoff the acquisition loop is built on: three years
 * of your own history, read in under two minutes, with the Wrapped viewer one
 * tap away.
 */
export function SyncDialog({
  today,
  trialLine = null,
}: {
  today: string;
  /** The reverse-trial line, stated once at the moment it starts. */
  trialLine?: string | null;
}) {
  const [progress, setProgress] = useState<SyncProgress>(IDLE);
  const [dismissed, setDismissed] = useState(false);
  const started = useRef(false);
  const router = useRouter();

  /*
   * Dropping ?connected=1 is what stops a refresh from starting a second
   * sync — the param is the trigger, so closing the dialog has to clear it.
   * The refresh then re-renders the screen the sync just filled in.
   */
  const close = useCallback(() => {
    setDismissed(true);
    router.replace("/you");
    router.refresh();
  }, [router]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/snaptrade/sync/progress", { cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as { progress: SyncProgress | null };
      if (body.progress) setProgress(body.progress);
    } catch {
      // A dropped poll is not a failed sync. Keep the last known state and
      // try again on the next tick.
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Deliberately not awaited: this request stays open until the sync
    // finishes, and the polling below is what makes the wait legible.
    void fetch("/api/snaptrade/sync", { method: "POST" }).catch(() => {});
  }, []);

  useEffect(() => {
    if (progress.status !== "running") return;
    const id = setInterval(poll, POLL_MS);
    void poll();
    return () => clearInterval(id);
  }, [poll, progress.status]);

  if (dismissed) return null;

  const steps = stepsFrom(progress);
  const done = progress.status === "done";
  const failed = progress.status === "failed";

  return (
    <div className={styles.scrim} role="dialog" aria-modal="true" aria-label="Reading your history">
      <div className={styles.panel}>
        <div className={styles.head}>
          <span className={styles.mark} data-spinning={progress.status === "running" ? "" : undefined}>
            <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="9.4" fill="none" stroke="currentColor" strokeOpacity=".2" strokeWidth="2.6" />
              <path
                d="M12 2.6a9.4 9.4 0 0 1 8.1 14.1"
                fill="none"
                stroke="var(--moss)"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <div className={styles.headText}>
            <span className={styles.eyebrow}>
              {failed ? "Sync stopped" : done ? "Sync complete" : "Reading your brokerage"}
            </span>
            <h2 className={`disp ${styles.title}`}>
              {failed
                ? "Your history is still on the brokerage"
                : done
                  ? "Everything you have done is in"
                  : "Your history is arriving"}
            </h2>
          </div>
        </div>

        <ol className={styles.steps}>
          {steps.map((step) => (
            <li key={step.phase} className={styles.step} data-state={step.state}>
              <div className={styles.stepHead}>
                <span className={styles.stepLabel}>{step.label}</span>
                <span className={styles.stepDetail}>{step.detail || stateWord(step.state)}</span>
              </div>
              <span className={styles.track}>
                <span className={styles.fill} style={{ transform: `scaleX(${step.fraction})` }} />
              </span>
            </li>
          ))}
        </ol>

        <p className={styles.foot}>
          {failed
            ? progress.error || "The brokerage did not answer. Nothing was lost — try the sync again."
            : done
              ? arrivalLine(progress, today)
              : "Read-only, permanently. Canopy never places a trade."}
        </p>

        {/*
          * The trial, stated once, at the only moment it is genuinely news.
          * It never appears again as a banner and never counts down.
          */}
        {done && trialLine ? <p className={styles.trial}>{trialLine}</p> : null}

        {done || failed ? (
          <div className={styles.actions}>
            {/*
             * Straight into the story viewer, not to a screen with a play
             * button on it. This hand-off is the acquisition loop: the first
             * thing a new user sees is their own year, and the share button
             * is already inside it.
             */}
            {done ? <Button href="/wrapped?play=1">See your year</Button> : null}
            <Button ghost onClick={close}>
              {done ? "Go to your score" : "Close"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function stateWord(state: string): string {
  if (state === "waiting") return "waiting";
  if (state === "failed") return "stopped";
  return "reading";
}
