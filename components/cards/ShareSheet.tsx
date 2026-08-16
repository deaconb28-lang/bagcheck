"use client";

import { useEffect, useState } from "react";
import {
  downloadName,
  imageUrl,
  shareTargets,
  type ShareFormat,
  type ShareTarget,
} from "@/lib/cards/share";
import styles from "./ShareSheet.module.css";

type ShareSheetProps = {
  type: string;
  /** 96 bits of randomness — the card's entire access model. */
  slug: string;
  label: string;
  onClose: () => void;
};

/**
 * Glyphs for the destinations. Drawn inline rather than fetched: these are
 * chrome on a modal that has to be complete on its first paint, and the icon
 * vocabulary in `lib/icons` is a closed taxonomy that does not include
 * third-party marks.
 */
const MARK: Record<string, React.ReactNode> = {
  x: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.22-6.82-5.96 6.82H1.68l7.73-8.84L1.25 2.25h6.82l4.71 6.23zm-1.16 17.52h1.83L7.08 4.13H5.11z" />
    </svg>
  ),
  instagram: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  ),
  tiktok: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-1.79-2.46V9.8a5.77 5.77 0 1 0 4.88 5.7V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.28 4.28 0 0 1-3.24-1.48z" />
    </svg>
  ),
  copy: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M10 13.5a3.6 3.6 0 0 0 5.2.3l2.6-2.6a3.6 3.6 0 0 0-5-5.1l-1.1 1" />
      <path d="M14 10.5a3.6 3.6 0 0 0-5.2-.3l-2.6 2.6a3.6 3.6 0 0 0 5 5.1l1.1-1" />
    </svg>
  ),
};

/**
 * The share sheet: the unfurl preview first, then the destinations.
 *
 * The preview is the OG image itself rather than a mock of it, so what the
 * user approves is exactly what a paste produces. On a phone the primary
 * action hands off to the platform share sheet, because that is where the
 * apps people actually post to live.
 */
export function ShareSheet({ type, slug, label, onClose }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  /*
   * Capabilities, not a user-agent guess. `canShare({files})` is the actual
   * question — whether this browser can hand a picture to the OS sheet, which
   * is the only route to Instagram or TikTok — and a phone that cannot do it
   * should get the download rather than a button that throws on tap.
   */
  const [caps, setCaps] = useState({ canShareFiles: false, canShareLink: false });

  // The typed URL is what gets pasted; the image lives at the slug, because
  // /og/[slug] already exists and two dynamic names cannot share a segment.
  const path = `/card/${encodeURIComponent(type)}/${encodeURIComponent(slug)}`;
  const image = imageUrl(slug, "unfurl");
  const [url, setUrl] = useState(path);

  useEffect(() => {
    setUrl(new URL(path, window.location.origin).toString());
    if (typeof navigator === "undefined") return;
    const probe = new File([new Blob()], "probe.png", { type: "image/png" });
    setCaps({
      canShareFiles: Boolean(navigator.canShare?.({ files: [probe] })),
      canShareLink: Boolean(navigator.share),
    });
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

  /**
   * Hand the real image file to the OS sheet — the only path to Instagram or
   * TikTok, neither of which has a web composer to open.
   */
  const shareFile = async (format: ShareFormat) => {
    setBusy(format);
    try {
      const res = await fetch(imageUrl(slug, format));
      const blob = await res.blob();
      const file = new File([blob], downloadName(type, format), { type: "image/png" });
      await navigator.share({ files: [file], text: `${label} · ${url}` });
    } catch {
      // A dismissed sheet is not an error, and neither is a fetch that the
      // user navigated away from. The download link below still works.
    } finally {
      setBusy(null);
    }
  };

  const run = (target: ShareTarget) => {
    const { action } = target;
    if (action.kind === "copy") return copy();
    if (action.kind === "native") return shareFile(action.format);
    if (action.kind === "open") {
      // noopener: an intent page must never get a handle on this window.
      window.open(action.href, "_blank", "noopener,noreferrer");
      return;
    }
    // download — an anchor click, so the browser names the file.
    const a = document.createElement("a");
    a.href = `${imageUrl(slug, action.format)}${action.format === "unfurl" ? "?" : "&"}download=1`;
    a.download = downloadName(type, action.format);
    a.click();
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
          <img src={image} alt="" width={1200} height={630} />
        </div>

        <div className={styles.url}>{url}</div>

        {/*
          * One row per destination, each saying what the tap does. Instagram
          * and TikTok are not links: neither platform has a web composer, so
          * they hand the image to the OS share sheet where those apps live,
          * or save it at the right aspect when the browser cannot.
          */}
        <ul className={styles.targets}>
          {shareTargets(url, `${label} — Canopy`, caps).map((target) => (
            <li key={target.id}>
              <button
                type="button"
                className={styles.target}
                data-target={target.id}
                disabled={busy !== null}
                onClick={() => run(target)}
              >
                <span className={styles.targetMark} aria-hidden="true">
                  {MARK[target.id]}
                </span>
                <span className={styles.targetText}>
                  <span className={styles.targetLabel}>
                    {target.id === "copy" && copied ? "Link copied" : target.label}
                  </span>
                  <span className={styles.targetNote}>{target.note}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        <p className={styles.note}>
          Sharing is never paywalled. Every card you earn posts at full quality on
          any plan.
        </p>
      </div>
    </div>
  );
}
