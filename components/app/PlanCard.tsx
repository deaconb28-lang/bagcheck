"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Chip, Eyebrow } from "@/components/primitives";
import { TIER_LABEL, TRIAL_DAYS, priceLine, type Tier } from "@/lib/tiers";
import styles from "./PlanCard.module.css";

type Props = {
  tier: Tier;
  /** Null until they have ever subscribed — nothing to manage yet. */
  hasCustomer: boolean;
  renewsOn: string | null;
  cancelAtPeriodEnd: boolean;
  configured: boolean;
  /**
   * The one line the reverse trial is allowed to say — a date, never a
   * countdown. Null when there is no trial to describe.
   */
  trialLine?: string | null;
  /** True while the trial is what is granting access. */
  onTrial?: boolean;
};

export function PlanCard({
  tier,
  hasCustomer,
  renewsOn,
  cancelAtPeriodEnd,
  configured,
  trialLine = null,
  onTrial = false,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function go(path: string, body?: unknown) {
    if (busy) return;
    setBusy(path);
    setError(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) {
        setError(json.error ?? "That did not open.");
        setBusy(null);
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("That did not open.");
      setBusy(null);
    }
  }

  return (
    <div className={styles.block}>
      <div className={styles.head}>
        <Eyebrow>Plan</Eyebrow>
        <Chip tone={tier === "free" ? "neutral" : "moss"}>{TIER_LABEL[tier]}</Chip>
        {/* The state is carried by the word, not by the chip's colour. */}
        {onTrial ? <Chip tone="neutral">Full access</Chip> : null}
      </div>

      <p className={styles.body}>
        Bagcheck is one plan at {priceLine()}, free for your first{" "}
        {TRIAL_DAYS} days. Every card your behaviour earns is yours to post,
        rare ones included, and a minted card stays live at its URL whether or
        not you carry on.
      </p>

      {trialLine ? <p className={styles.meta}>{trialLine}</p> : null}

      {renewsOn ? (
        <p className={styles.meta}>
          {cancelAtPeriodEnd ? "Ends" : "Renews"} {renewsOn}
        </p>
      ) : null}

      {!configured ? (
        <p className={styles.meta}>Billing is not configured on this deployment.</p>
      ) : (
        <div className={styles.actions}>
          {/*
           * One paid plan, so one button. The two-tier version rendered a row
           * per plan off a shared `busy` flag, which put "Opening…" on both.
           */}
          {tier === "free" ? (
            <div className={styles.option}>
              <Button ghost onClick={() => go("/api/billing/checkout", { tier: "pro" })}>
                {busy ? "Opening…" : `Subscribe — ${priceLine()}`}
              </Button>
              <Link className={styles.who} href="/pricing">
                See the plan
              </Link>
            </div>
          ) : null}
          {hasCustomer ? (
            <button
              type="button"
              className={styles.manage}
              onClick={() => go("/api/billing/portal")}
            >
              Manage billing
            </button>
          ) : null}
        </div>
      )}

      {error ? <p className={styles.error}>{error}</p> : null}
    </div>
  );
}
