"use client";

import { useRef, useState } from "react";
import styles from "./landing.module.css";

/*
 * The swipeable Wrapped stack — the design's "Swipe the top card away".
 * Five cards; dragging (or tapping) the top one sends it to the back, so
 * the stack loops forever. No library: one pointer handler and a CSS
 * transform. The static state is the full stack, which is the finished
 * design when JS never runs.
 */

const CARDS = [
  { key: "return", label: "2026 WRAPPED" },
  { key: "topbag", label: "TOP BAG" },
  { key: "trade", label: "BEST TRADE" },
  { key: "hands", label: "DIAMOND HANDS" },
  { key: "type", label: "YOUR TYPE" },
] as const;

export function WrappedStack({ faces }: { faces: Record<string, React.ReactNode> }) {
  const [order, setOrder] = useState(CARDS.map((c) => c.key as string));
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  function cycle() {
    setOrder((o) => [...o.slice(1), o[0]]);
    setDrag(null);
    start.current = null;
  }

  function onDown(e: React.PointerEvent) {
    start.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function onMove(e: React.PointerEvent) {
    if (!start.current) return;
    setDrag({ dx: e.clientX - start.current.x, dy: e.clientY - start.current.y });
  }

  function onUp() {
    if (drag && Math.hypot(drag.dx, drag.dy) > 90) cycle();
    else if (drag && Math.hypot(drag.dx, drag.dy) < 6) cycle(); // a tap advances too
    else {
      setDrag(null);
      start.current = null;
    }
  }

  return (
    <div className={styles.stack} aria-label="Wrapped cards — swipe or tap to see the next">
      {order.map((key, i) => (
        <div
          key={key}
          className={styles.stackCard}
          data-depth={Math.min(i, 3)}
          style={
            i === 0 && drag
              ? {
                  transform: `translate(${drag.dx}px, ${drag.dy * 0.6}px) rotate(${drag.dx * 0.05}deg)`,
                  transition: "none",
                  cursor: "grabbing",
                }
              : undefined
          }
          onPointerDown={i === 0 ? onDown : undefined}
          onPointerMove={i === 0 ? onMove : undefined}
          onPointerUp={i === 0 ? onUp : undefined}
          onPointerCancel={i === 0 ? () => { setDrag(null); start.current = null; } : undefined}
        >
          {faces[key]}
        </div>
      ))}
    </div>
  );
}
