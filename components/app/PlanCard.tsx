"use client";

import { useState } from "react";
import { Button, Chip, Eyebrow } from "@/components/primitives";
import { TIER_LABEL, type Tier } from "@/lib/billing/tiers";
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

const UPGRADES: Array<{ tier: Exclude<Tier, "free">; price: string; who: string }> = [
  { tier: "plus", price: "$9/mo", who: "Depth for people who write" },
  { tier: "trader", price: "$29/mo", who: "Cadence and proof" },
];

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
        Every card your behaviour earns is yours to post on any tier, rare ones
        included. Paid tiers add formats.
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
          {UPGRADES.filter((u) => u.tier !== tier).map((u) => (
            <div key={u.tier} className={styles.option}>
              <Button ghost onClick={() => go("/api/billing/checkout", { tier: u.tier })}>
                {busy ? "Opening…" : `${TIER_LABEL[u.tier]} — ${u.price}`}
              </Button>
              <span className={styles.who}>{u.who}</span>
            </div>
          ))}
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
