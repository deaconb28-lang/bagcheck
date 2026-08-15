"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { spanLabel } from "@/lib/snaptrade/progress";
import type { SyncProgress } from "@/lib/snaptrade/progress";
import styles from "./SyncNow.module.css";

const POLL_MS = 1000;

/**
 * Read the brokerage again, from wherever you are.
 *
 * Until this existed there was no way to run a sync from inside the product:
 * the only triggers were the post-connect first run, the `?connected=1`
 * dialog, and a button on `/debug`. Which meant a reader whose dashboard
 * looked stale — or empty — had nothing to press, and the honest answer was
 * "wait for tonight". The sync pill was already on every screen reporting
 * when the last read happened; it is the obvious thing to make pressable.
 *
 * It is the pill, not a new control: chrome does not get a second element
 * for a job the first one is already describing. The dot marks live data,
 * the label says when, and pressing it reads again.
 *
 * Progress comes from polling the board the sync writes, never from a timer
 * — a meter that advanced on its own would be inventing a fact about
 * someone's own history.
 */
/** `syncedAt` is elapsed time — "2h ago" — so it reads the same in every timezone. */
export function SyncNow({ syncedAt }: { syncedAt: string | null }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [failed, setFailed] = useState(false);
  const timer = useRef<number | null>(null);
  const router = useRouter();

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/snaptrade/sync/progress", { cache: "no-store" });
      if (!res.ok) return;
      const body = (await res.json()) as { progress: SyncProgress | null };
      if (body.progress) setProgress(body.progress);
    } catch {
      /* A dropped poll is not a failed sync. */
    }
  }, []);

  useEffect(() => () => {
    if (timer.current) window.clearInterval(timer.current);
  }, []);

  async function run() {
    if (running) return;
    setRunning(true);
    setFailed(false);
    setProgress(null);
    timer.current = window.setInterval(poll, POLL_MS);

    try {
      const res = await fetch("/api/snaptrade/sync", { method: "POST" });
      if (!res.ok) {
        setFailed(true);
        return;
      }
      /*
       * The screen is server-rendered from what the sync just wrote — the
       * ledger, the derived layer and now the score — so it has to be asked
       * again rather than patched in place.
       */
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      if (timer.current) window.clearInterval(timer.current);
      setRunning(false);
    }
  }

  const label = running
    ? runningLabel(progress)
    : failed
      ? "Sync failed — try again"
      : syncedAt
        ? `Synced ${syncedAt}`
        : "Never synced";

  return (
    <button
      type="button"
      className={styles.sync}
      onClick={run}
      disabled={running}
      data-running={running || undefined}
      data-failed={failed || undefined}
      title={running ? "Reading your brokerage" : "Read your brokerage again"}
    >
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </button>
  );
}

/** What the sync is doing, in the pill's own width. Never a percentage. */
function runningLabel(p: SyncProgress | null): string {
  if (!p) return "Reading…";
  switch (p.phase) {
    case "accounts":
      return p.accountsTotal
        ? `Accounts ${p.accountsDone}/${p.accountsTotal}`
        : "Reading accounts…";
    case "positions":
      return p.positions ? `${p.positions} positions` : "Reading positions…";
    case "history":
      return p.transactions
        ? `${p.transactions.toLocaleString("en-US")} fills`
        : "Reading fills…";
    case "derive":
      return "Scoring…";
    default:
      return spanLabel(p.earliestDate, new Date().toISOString().slice(0, 10)) ?? "Reading…";
  }
}
