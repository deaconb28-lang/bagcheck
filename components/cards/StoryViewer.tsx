"use client";

import { useEffect, useState } from "react";
import { ShareButton } from "@/components/app/ShareButton";
import styles from "./StoryViewer.module.css";

export type StoryCard = {
  eyebrow: string;
  value: string;
  tail: string;
  tone?: "moss" | "signal" | "ink";
};

/**
 * The Wrapped player. 9:16, on the ink field, full-bleed on a phone.
 *
 * Tap zones rather than buttons, because that is the gesture every story
 * viewer has trained: left 35% goes back, right 65% goes on. Keyboard gets
 * arrows and Escape, so the same thing works without a touch screen.
 */
export function StoryViewer({
  cards,
  onClose,
  art,
}: {
  cards: StoryCard[];
  onClose: () => void;
  art?: string | null;
}) {
  const [index, setIndex] = useState(0);
  const card = cards[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setIndex((i) => Math.min(cards.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cards.length, onClose]);

  if (!card) return null;

  const next = () => (index >= cards.length - 1 ? onClose() : setIndex(index + 1));
  const prev = () => setIndex(Math.max(0, index - 1));

  return (
    <div className={styles.scrim} role="dialog" aria-modal="true" aria-label="Wrapped">
      <div className={styles.frame}>
        {art ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.art} src={art} alt="" aria-hidden="true" />
        ) : null}

        <div className={styles.bars} aria-hidden="true">
          {cards.map((_, i) => (
            <i key={i} className={styles.bar} data-filled={i <= index || undefined} />
          ))}
        </div>

        <button type="button" className={styles.zoneLeft} onClick={prev} aria-label="Previous" />
        <button type="button" className={styles.zoneRight} onClick={next} aria-label="Next" />

        <div className={styles.content}>
          <span className={styles.eyebrow}>{card.eyebrow}</span>
          <div className={`num ${styles.value}`} data-tone={card.tone ?? "ink"}>
            {card.value}
          </div>
          <p className={styles.tail}>{card.tail}</p>
        </div>

        <div className={styles.foot}>
          <ShareButton type="wrapped" label="your Wrapped" size={38} onInk />
          <button type="button" className={styles.done} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
