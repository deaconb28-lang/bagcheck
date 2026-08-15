"use client";

import { useState } from "react";
import styles from "../pricing.module.css";

/**
 * The one button that starts a checkout.
 *
 * It names a tier and never a price — the mapping is read server-side, so a
 * crafted request cannot buy a price we did not offer.
 */
export function PricingCta({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "pro" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.url) {
        setError(json.error ?? "Checkout did not open.");
        setBusy(false);
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("Checkout did not open.");
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={styles.cta} data-solid="" onClick={go}>
        {busy ? "Opening…" : label}
      </button>
      {error ? <p className={styles.ctaNote}>{error}</p> : null}
    </>
  );
}
