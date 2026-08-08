"use client";

import { useState } from "react";
import { Logo } from "@/components/primitives";
import { WHY_OPTIONS, progressLine, queueLine, tagProgress, whyKey } from "@/lib/tags";
import type { Conviction, UntaggedEntry, Why } from "@/lib/tags";
import { KIND_FLOOR } from "@/lib/tags";
import styles from "./TagPrompt.module.css";

type TagPromptProps = {
  queue: UntaggedEntry[];
  tagged: number;
  total: number;
};

const money = (v: number | null, currency: string | null) =>
  v == null
    ? "—"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency || "USD",
        maximumFractionDigits: 0,
      }).format(Math.abs(v));

/**
 * Two taps: why, and conviction 1–5.
 *
 * This is the only input a brokerage cannot supply, and every correlation in
 * the engine is downstream of it — which is why it sits second on Home rather
 * than in a settings screen. There is no text field on purpose: a free-text
 * reason cannot be grouped, and a reason that cannot be grouped cannot become
 * a finding.
 *
 * It also doubles as the honest upgrade argument. The paid insight is gated
 * on data the user is producing, not on a paywall.
 */
export function TagPrompt({ queue, tagged, total }: TagPromptProps) {
  const [index, setIndex] = useState(0);
  const [why, setWhy] = useState<Why | null>(null);
  const [conviction, setConviction] = useState<Conviction | null>(null);
  const [saved, setSaved] = useState(tagged);
  const [busy, setBusy] = useState(false);

  const entry = queue[index];
  const progress = tagProgress(saved, total);

  if (!entry) {
    return (
      <div className={styles.wrap}>
        <div className={styles.headText}>
          <span className={styles.eyebrow}>{queueLine(0)}</span>
          <h2 className={`disp ${styles.title}`}>Every position carries its reason</h2>
        </div>
        <Meter progress={progress} />
      </div>
    );
  }

  async function commit(nextWhy: Why | null, nextConviction: Conviction | null) {
    if (!nextWhy || nextConviction == null || busy) return;
    setBusy(true);
    try {
      await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: entry.externalId,
          why: whyKey(nextWhy),
          conviction: nextConviction,
        }),
      });
      setSaved((n) => n + 1);
      setIndex((i) => i + 1);
      setWhy(null);
      setConviction(null);
    } catch {
      // Keep the selection on screen so the tap is not silently lost.
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <Logo symbol={entry.symbol} size={38} />
        <div className={styles.headText}>
          <span className={styles.eyebrow}>{queueLine(queue.length - index)}</span>
          <h2 className={`disp ${styles.title}`}>
            Why did you open {entry.symbol} on {entry.date.slice(5)}?
          </h2>
          <span className={styles.facts}>
            {money(entry.amount, entry.currency)} ·{" "}
            {entry.units ? `${entry.units} units` : "units not reported"} · your ledger
            supplies the what
          </span>
        </div>
        <div className={styles.conviction} role="group" aria-label="Conviction">
          {([1, 2, 3, 4, 5] as Conviction[]).map((n) => (
            <button
              key={n}
              type="button"
              className={styles.dot}
              aria-pressed={conviction != null && n <= conviction}
              title={`Conviction ${n}`}
              onClick={() => {
                setConviction(n);
                void commit(why, n);
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.chips}>
        {WHY_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={styles.chip}
            aria-pressed={why === option}
            onClick={() => {
              setWhy(option);
              void commit(option, conviction);
            }}
          >
            {option}
          </button>
        ))}
      </div>

      <Meter progress={progress} />
    </div>
  );
}

function Meter({ progress }: { progress: ReturnType<typeof tagProgress> }) {
  return (
    <div className={styles.meterBlock}>
      <div className={styles.meterHead}>
        <span>{progress.tagged} of 100 tagged</span>
        <span>{progress.unlocked ? "Correlations running" : "Correlations unlock at 100"}</span>
      </div>
      <div className={styles.track}>
        <i className={styles.fill} style={{ width: `${progress.pct}%` }} />
      </div>
      <p className={styles.note}>
        {progressLine(progress)}. Tagged entries start showing up in Patterns once{" "}
        {KIND_FLOOR} of a kind are on file.
      </p>
    </div>
  );
}
