"use client";

import { useEffect, useState } from "react";
import styles from "./ShareSheet.module.css";

type ShareSheetProps = {
  type: string;
  /** 96 bits of randomness — the card's entire access model. */
  slug: string;
  label: string;
  onClose: () => void;
};

/**
 * The share sheet: the unfurl preview first, then the actions.
 *
 * The preview is the OG image itself rather than a mock of it, so what the
 * user approves is exactly what a paste produces. On a phone the primary
 * action hands off to the platform share sheet, because that is where the
 * apps people actually post to live.
 */
export function ShareSheet({ type, slug, label, onClose }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  // The typed URL is what gets pasted; the image lives at the slug, because
  // /og/[slug] already exists and two dynamic names cannot share a segment.
  const path = `/card/${encodeURIComponent(type)}/${encodeURIComponent(slug)}`;
  const image = `/og/${encodeURIComponent(slug)}`;
  const [url, setUrl] = useState(path);

  useEffect(() => {
    setUrl(new URL(path, window.location.origin).toString());
    setCanNativeShare(typeof navigator !== "undefined" && Boolean(navigator.share));
  }, [path]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied — the link is on screen and selectable either way.
    }
  };

  const share = async () => {
    try {
      await navigator.share({ url, title: `Bagcheck — ${label}` });
    } catch {
      // A dismissed share sheet is not an error.
    }
  };

  return (
    <div className={styles.scrim} role="dialog" aria-modal="true" aria-label={`Share ${label}`} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <span className={styles.eyebrow}>Share {label}</span>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* The unfurl, drawn by the same route a paste will hit. */}
        <div className={styles.preview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" width={1200} height={630} />
        </div>

        <div className={styles.url}>{url}</div>

        <div className={styles.actions}>
          {canNativeShare ? (
            <button type="button" className={styles.primary} onClick={share}>
              Share
            </button>
          ) : null}
          <button type="button" className={canNativeShare ? styles.ghost : styles.primary} onClick={copy}>
            {copied ? "Link copied" : "Copy link"}
          </button>
          <a className={styles.ghost} href={`${image}?download=1`} download={`bagcheck-${type}-${slug}.png`}>
            Download PNG
          </a>
        </div>

        <p className={styles.note}>
          Sharing is never paywalled. Every card you earn posts at full quality on
          any plan.
        </p>
      </div>
    </div>
  );
}
