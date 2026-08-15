"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./landing.module.css";

/*
 * The Wrapped deck. Five cards on one pile; the top one flies off and lands at
 * the back every 5.2s, or on a drag, an arrow, or a dot. Any manual move stops
 * the autoplay for good — once someone is steering, the deck stops steering.
 * The static state is the full stack with card one on top, which is the
 * finished design when JS never runs.
 */

const COUNT = 5;
const HOLD_MS = 5200;
const FLY_MS = 380;

export function WrappedDeck({ faces }: { faces: React.ReactNode[] }) {
  const [order, setOrder] = useState(() => [0, 1, 2, 3, 4]);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [fly, setFly] = useState(0);
  const [auto, setAuto] = useState(false);
  const busy = useRef(false);
  const startX = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setAuto(true);
  }, []);

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => throwTop(1), HOLD_MS);
    return () => clearInterval(t);
    // Deliberately keyed on `auto` alone: re-running this on every render of
    // throwTop would restart the timer and the deck would never advance.
  }, [auto]);

  function throwTop(dir: number) {
    if (busy.current) return;
    busy.current = true;
    setFly(dir);
    setDrag(0);
    setDragging(false);
    setTimeout(() => {
      setOrder((o) => [...o.slice(1), o[0]]);
      setFly(0);
      busy.current = false;
    }, FLY_MS);
  }

  function bringBack() {
    if (busy.current) return;
    setAuto(false);
    setOrder((o) => [o[o.length - 1], ...o.slice(0, -1)]);
  }

  function goTo(k: number) {
    if (busy.current) return;
    setAuto(false);
    setOrder((o) => {
      const n = o.slice();
      while (n[0] !== k) n.push(n.shift() as number);
      return n;
    });
  }

  function onDown(e: React.PointerEvent) {
    if (busy.current) return;
    startX.current = e.clientX;
    setDragging(true);
    setAuto(false);
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* pointer capture is a nicety, not a requirement */
    }
  }

  function onMove(e: React.PointerEvent) {
    if (!dragging) return;
    setDrag(e.clientX - startX.current);
  }

  function onUp() {
    if (!dragging) return;
    if (Math.abs(drag) > 90) throwTop(drag < 0 ? -1 : 1);
    else {
      setDragging(false);
      setDrag(0);
    }
  }

  return (
    <>
      <div className={styles.deckHead}>
        <div>
          <span className={styles.eyebrow}>THE WRAPPED</span>
          <h2 className={styles.h2}>
            See your portfolio,
            <br />
            beautifully.
          </h2>
        </div>
        <div className={styles.deckNav}>
          <span className={styles.deckHint}>Swipe the top card away</span>
          <button type="button" className={styles.deckArrow} onClick={bringBack} aria-label="Previous card">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            className={styles.deckArrow}
            data-primary=""
            onClick={() => {
              setAuto(false);
              throwTop(1);
            }}
            aria-label="Next card"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={styles.deck}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        {faces.map((face, k) => {
          const rank = order.indexOf(k);
          const top = rank === 0;
          const stack = `translate(-50%, ${rank * 20}px) scale(${(1 - rank * 0.05).toFixed(3)})`;
          let transform = stack;
          let transition: string | undefined;
          let opacity = 1;
          if (top && fly) {
            transform = `translate(calc(-50% + ${fly * 780}px), -30px) rotate(${fly * 15}deg)`;
            transition = "transform 400ms cubic-bezier(.4,0,.7,1), opacity 400ms ease";
            opacity = 0;
          } else if (top && dragging) {
            transform = `translate(calc(-50% + ${drag}px), 0) rotate(${(drag * 0.04).toFixed(2)}deg)`;
            transition = "none";
          }
          return (
            <div
              key={k}
              className={styles.deckCard}
              style={{ transform, transition, opacity, zIndex: 10 - rank }}
            >
              {face}
            </div>
          );
        })}
      </div>

      <div className={styles.deckDots}>
        {Array.from({ length: COUNT }, (_, k) => (
          <button
            key={k}
            type="button"
            className={styles.deckDot}
            data-on={order[0] === k || undefined}
            onClick={() => goTo(k)}
            aria-label={`Card ${k + 1}`}
          />
        ))}
      </div>
    </>
  );
}
