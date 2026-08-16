"use client";

import { useState } from "react";
import styles from "./BadgeMint.module.css";

/**
 * Mint-and-copy for the live score badge. The mint is idempotent — one badge
 * per account — so the button's only real job is to surface the URL.
 */
export function BadgeMint() {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "copied" | "failed">("idle");

  async function activate() {
    if (state === "busy") return;
    setState("busy");
    try {
      let embed = url;
      if (!embed) {
        const res = await fetch("/api/badge/mint", { method: "POST" });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || !body.url) throw new Error(body.error ?? "mint failed");
        embed = new URL(body.url, window.location.origin).toString();
        setUrl(embed);
      }
      await navigator.clipboard.writeText(embed);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className={styles.row}>
      <button type="button" className={styles.button} onClick={activate}>
        {state === "copied" ? "Badge URL copied" : "Copy your live badge URL"}
      </button>
      {state === "failed" ? <span className={styles.note}>That did not mint.</span> : null}
      {url ? (
        // An SVG our own route renders at a known size.
        <img src={url} alt="Your live Canopy badge" width={232} height={64} />
      ) : null}
    </div>
  );
}
