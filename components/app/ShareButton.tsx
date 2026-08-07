"use client";

import { useState } from "react";
import { Button } from "@/components/primitives";

type State = "idle" | "minting" | "done" | "error";

/**
 * Mint a card and hand back its link. The card page is public by design —
 * that is the whole loop — so the button says so before it makes one.
 */
export function ShareButton({ kind, label }: { kind: string; label: string }) {
  const [state, setState] = useState<State>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function mint() {
    if (state === "minting") return;
    setState("minting");
    setMessage(null);
    try {
      const res = await fetch("/api/cards/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setMessage(body.error ?? "That did not mint.");
        return;
      }
      const full = `${window.location.origin}${body.url}`;
      setUrl(full);
      setState("done");
      try {
        if (navigator.share) await navigator.share({ url: full });
        else await navigator.clipboard.writeText(full);
      } catch {
        // Share sheet dismissed, or no clipboard permission. The link is on
        // screen either way, so this is not a failure worth reporting.
      }
    } catch {
      setState("error");
      setMessage("That did not mint.");
    }
  }

  if (state === "done" && url) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <a
          href={url}
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 11.5,
            color: "var(--accent-deep)",
            wordBreak: "break-all",
          }}
        >
          {url.replace(/^https?:\/\//, "")}
        </a>
        <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, color: "var(--meta)" }}>
          Copied. Anyone with this link can open the card.
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Button ghost onClick={mint}>
        {state === "minting" ? "Minting…" : label}
      </Button>
      <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, color: "var(--meta)" }}>
        {message ?? "Makes a public link you can paste anywhere."}
      </span>
    </div>
  );
}
