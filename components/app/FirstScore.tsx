"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/primitives";

/**
 * The way out of "no score yet".
 *
 * A synced account with no score doc renders an empty state, and until this
 * existed the only thing that could write that doc was the nightly cron or a
 * button on `/debug` — so someone who finished onboarding and opened their
 * dashboard was told to come back tomorrow, on a screen with no way to act.
 * The first sync now scores as it finishes, which makes that state rare; this
 * is what a reader does when they hit it anyway.
 *
 * It reports what happened rather than spinning silently, because the one
 * thing worse than an empty dashboard is a button that appears to do nothing.
 */
export function FirstScore() {
  const [state, setState] = useState<"idle" | "running" | "failed">("idle");
  const router = useRouter();

  async function run() {
    if (state === "running") return;
    setState("running");
    try {
      const res = await fetch("/api/score/recompute", { method: "POST" });
      if (!res.ok) {
        setState("failed");
        return;
      }
      /* The page is server-rendered from the doc that just appeared. */
      router.refresh();
      setState("idle");
    } catch {
      setState("failed");
    }
  }

  return (
    <>
      <Button onClick={run}>
        {state === "running" ? "Scoring your ledger…" : "Score my ledger now"}
      </Button>
      {state === "failed" ? (
        <p role="status">
          That did not finish. Your ledger is untouched, and tonight&rsquo;s run
          scores it either way.
        </p>
      ) : null}
    </>
  );
}
