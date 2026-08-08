"use client";

import { useState } from "react";
import { ShareSheet } from "@/components/cards/ShareSheet";
import styles from "./ShareButton.module.css";

type ShareButtonProps = {
  /** The card kind. The server decides whether it has been earned. */
  type: string;
  /** What the sheet says it is sharing. */
  label: string;
  /**
   * An already-minted card's slug. The trophy case has these; everywhere
   * else the card is minted on the first tap.
   */
  slug?: string;
  /** 30–38px. Larger where it sits alone in a band. */
  size?: number;
  /** On the ink field the ghost inverts. */
  onInk?: boolean;
};

/**
 * The one share affordance, on every object with a number.
 *
 * Tapping it mints through the server, which recomputes the whole card from
 * the ledger — the client names a kind and never supplies contents, so a
 * crafted request cannot mint a card claiming a number that never happened.
 * What comes back is a slug of 96 random bits, which is the card's entire
 * access model and the reason the public page is safe to paste.
 *
 * A locked card must never render this. The rule is that the button is
 * absent, not disabled: showing someone an affordance that then refuses them
 * is worse than not offering it. Callers enforce that by not rendering it.
 */
export function ShareButton({ type, label, slug, size = 32, onInk = false }: ShareButtonProps) {
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  async function activate() {
    if (busy) return;
    if (slug) {
      setOpen(slug);
      return;
    }
    setBusy(true);
    setFailed(null);
    try {
      const res = await fetch("/api/cards/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: type }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.slug) {
        setFailed(body.error ?? "That card has not been earned yet.");
        return;
      }
      setOpen(body.slug as string);
    } catch {
      setFailed("That did not mint.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.button}
        data-on-ink={onInk || undefined}
        data-busy={busy || undefined}
        style={{ "--size": `${size}px` } as React.CSSProperties}
        title={failed ?? `Share ${label}`}
        aria-label={`Share ${label}`}
        onClick={activate}
      >
        <svg
          width={size < 34 ? 15 : 16}
          height={size < 34 ? 15 : 16}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 15.4V3.6" />
          <path d="M8.2 7.2 12 3.4l3.8 3.8" />
          <path d="M6.4 12.4H4.6v7.4a1 1 0 0 0 1 1h12.8a1 1 0 0 0 1-1v-7.4h-1.8" />
        </svg>
      </button>
      {open ? (
        <ShareSheet type={type} slug={open} label={label} onClose={() => setOpen(null)} />
      ) : null}
    </>
  );
}
