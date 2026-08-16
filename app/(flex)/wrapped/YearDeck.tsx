"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./yeardeck.module.css";

/**
 * Your year, as twelve posters you scroll.
 *
 * Each card is a finished 1080×1920 document — its own stylesheet, its own
 * faces, its own background — so it is framed rather than re-implemented. An
 * iframe is the honest container for that: a card is an artefact with a
 * palette saturated well past anything the app uses, and dropping twelve fixed
 * 1080px stages into the app's own DOM would put those two vocabularies in one
 * cascade and let each fight the other.
 *
 * `srcdoc` rather than a src, because the document is already in hand from the
 * server render — a src would be twelve more round trips for markup the page
 * already carries. The frames are inert to the reader: `pointer-events: none`,
 * so a drag scrolls the rail rather than selecting text inside a card.
 *
 * The scale is CSS, not a rendering choice. The stage stays 1080×1920 at every
 * size and the wrapper scales it, so a card in the rail and a card full screen
 * are the same drawing at two magnifications — never two layouts that have to
 * be kept in step.
 */
export function YearDeck({
  cards,
  year,
}: {
  cards: Array<{ no: string; key: string; html: string; caption: string }>;
  year: number;
}) {
  const rail = useRef<HTMLOListElement>(null);
  const [at, setAt] = useState<number | null>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  /* Which arrows are live. A disabled arrow is quieter than a dead one. */
  const measure = useCallback(() => {
    const el = rail.current;
    if (!el) return;
    setEdge({
      start: el.scrollLeft <= 8,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8,
    });
  }, []);

  useEffect(() => {
    measure();
    const el = rail.current;
    if (!el) return;
    el.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const nudge = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  /* The player: arrows, escape, and the frame the reader stopped on. */
  useEffect(() => {
    if (at == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAt(null);
      if (e.key === "ArrowRight") setAt((n) => Math.min((n ?? 0) + 1, cards.length - 1));
      if (e.key === "ArrowLeft") setAt((n) => Math.max((n ?? 0) - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [at, cards.length]);

  if (!cards.length) return null;

  return (
    <>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Wrapped · {year}</p>
          <h2 className={styles.h2}>Your year, in {cards.length} cards</h2>
        </div>
        <div className={styles.controls}>
          <button type="button" className={styles.play} onClick={() => setAt(0)}>
            Play your year
          </button>
          <button
            type="button"
            className={styles.arrow}
            onClick={() => nudge(-1)}
            disabled={edge.start}
            aria-label="Previous cards"
          >
            <Chevron dir="left" />
          </button>
          <button
            type="button"
            className={styles.arrow}
            onClick={() => nudge(1)}
            disabled={edge.end}
            aria-label="More cards"
          >
            <Chevron dir="right" />
          </button>
        </div>
      </div>

      <ol className={styles.rail} ref={rail}>
        {cards.map((card, i) => (
          <li key={card.no} className={styles.frame}>
            <button
              type="button"
              className={styles.open}
              onClick={() => setAt(i)}
              aria-label={`Open card ${card.no}`}
            >
              <span className={styles.stage}>
                <iframe
                  className={styles.paper}
                  srcDoc={card.html}
                  title={card.caption || `Card ${card.no}`}
                  loading={i < 3 ? "eager" : "lazy"}
                  tabIndex={-1}
                  scrolling="no"
                />
              </span>
            </button>
            <p className={styles.no}>{card.no}</p>
          </li>
        ))}
      </ol>

      {at != null ? (
        <div className={styles.player} role="dialog" aria-modal="true" aria-label="Your year">
          <div className={styles.ticks} aria-hidden="true">
            {cards.map((c, i) => (
              <span key={c.no} className={styles.tick} data-on={i <= at ? "" : undefined} />
            ))}
          </div>

          <button
            type="button"
            className={styles.close}
            onClick={() => setAt(null)}
            aria-label="Close"
          >
            <Cross />
          </button>

          {/*
            Half the width steps back, half steps forward — the story grammar
            every reader already knows from every other story player, and the
            reason there is no button to find.
          */}
          <button
            type="button"
            className={styles.back}
            onClick={() => setAt((n) => Math.max((n ?? 0) - 1, 0))}
            aria-label="Previous"
          />
          <button
            type="button"
            className={styles.next}
            onClick={() =>
              setAt((n) => ((n ?? 0) + 1 >= cards.length ? null : (n ?? 0) + 1))
            }
            aria-label="Next"
          />

          <span className={styles.full}>
            <iframe
              className={styles.paper}
              srcDoc={cards[at].html}
              title={cards[at].caption || `Card ${cards[at].no}`}
              scrolling="no"
            />
          </span>
        </div>
      ) : null}
    </>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

function Cross() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
