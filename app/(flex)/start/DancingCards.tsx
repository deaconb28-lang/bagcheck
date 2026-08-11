"use client";

import { Artwork } from "@/components/cards/Artwork";
import type { CardHue, CardKind } from "@/lib/cards";
import styles from "./start.module.css";

/**
 * The twelve artworks, orbiting the connect panel.
 *
 * This screen has one job — get a brokerage linked — and one problem: the
 * SnapTrade portal takes a beat, and a spinner in that beat is dead air. So
 * the wait is spent showing what is being built. Every card here is the same
 * artwork the finished Wrapped uses, wearing no figures, because the figures
 * are exactly what does not exist yet.
 *
 * The dance is CSS: each card drifts on its own long loop, on its own delay,
 * so the field never pulses in unison. It is `aria-hidden` — decoration
 * around the panel, not content — and it stops entirely under reduced
 * motion, where the same twelve cards simply sit where they were dealt.
 */

const DECK: Array<{ kind: CardKind; hue: CardHue; x: number; y: number; r: number; s: number; d: number }> = [
  { kind: "health", hue: "violet", x: 5, y: 12, r: -8, s: 1, d: 0 },
  { kind: "streak", hue: "ember", x: 17, y: 58, r: 6, s: 0.86, d: -3.2 },
  { kind: "equity", hue: "azure", x: 2, y: 74, r: -4, s: 0.72, d: -6.1 },
  { kind: "bestDecision", hue: "moss", x: 24, y: 4, r: 9, s: 0.78, d: -1.7 },
  { kind: "monthlyPnl", hue: "moss", x: 30, y: 82, r: -7, s: 0.66, d: -8.4 },
  { kind: "longestHold", hue: "ember", x: 76, y: 8, r: 7, s: 0.92, d: -2.5 },
  { kind: "archetype", hue: "violet", x: 88, y: 46, r: -6, s: 1, d: -5.3 },
  { kind: "holdRatio", hue: "azure", x: 70, y: 76, r: 5, s: 0.8, d: -7.6 },
  { kind: "correlation", hue: "violet", x: 92, y: 84, r: -9, s: 0.68, d: -4.4 },
  { kind: "drawdownHeld", hue: "moss", x: 60, y: 92, r: 8, s: 0.62, d: -9.2 },
  { kind: "cadence", hue: "azure", x: 46, y: 2, r: -5, s: 0.7, d: -6.8 },
  { kind: "noPanic", hue: "moss", x: 40, y: 90, r: 4, s: 0.58, d: -10.5 },
];

export function DancingCards() {
  return (
    <div className={styles.deck} aria-hidden="true">
      {DECK.map((c) => (
        <div
          key={c.kind}
          className={styles.floater}
          style={
            {
              left: `${c.x}%`,
              top: `${c.y}%`,
              "--rot": `${c.r}deg`,
              "--scale": c.s,
              animationDelay: `${c.d}s`,
            } as React.CSSProperties
          }
        >
          <div className={styles.floaterCard}>
            <Artwork kind={c.kind} hue={c.hue} />
          </div>
        </div>
      ))}
    </div>
  );
}
