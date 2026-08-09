"use client";

import { useState } from "react";
import { Avatar } from "@/components/primitives";
import type { Archetype } from "@/lib/archetypes";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { ShareButton } from "@/components/app/ShareButton";
import { Locked } from "@/components/app/Locked";
import { StoryViewer } from "@/components/cards/StoryViewer";
import { WrappedCard } from "@/components/cards/WrappedCard";
import type { CardSpec } from "@/lib/cards/kinds";
import type { StoryCard } from "@/components/cards/StoryViewer";
import type { Tier } from "@/lib/tiers";
import screen from "../screen.module.css";
import styles from "./wrapped.module.css";

type Trip = { symbol: string; holdDays: number; pnl: number } | null;

export type WrappedViewProps = {
  year: number;
  archetype: Archetype;
  scoredDays: number;
  transactionCount: number;
  /** Every card this history has earned, strongest statement first. */
  cards: CardSpec[];
  winnerHold: number | null;
  loserHold: number | null;
  bestDecision: Trip;
  longestHold: Trip;
  score: number;
  delta: number | null;
  syncedAt: string | null;
  tier: Tier;
  /** Open the story viewer on mount — set by the onboarding hand-off. */
  autoplay?: boolean;
};

const days = (n: number | null) => (n == null ? "—" : n < 10 ? n.toFixed(1) : n.toFixed(0));
const usd = (n: number) =>
  `${n >= 0 ? "+" : "−"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

/**
 * The annual archive.
 *
 * The fan carries an eyebrow and a figure only — no tails. At any overlap
 * that actually reads as a fan, a tail would be occluded by the card in
 * front of it, so the card that needs a sentence is not a fan card.
 */
export function WrappedView(props: WrappedViewProps) {
  const {
    year,
    archetype,
    scoredDays,
    transactionCount,
    cards,
    winnerHold,
    loserHold,
    bestDecision,
    longestHold,
    score,
    delta,
    syncedAt,
    tier,
    autoplay = false,
  } = props;
  /*
   * `autoplay` comes from the onboarding hand-off — the sync dialog links
   * here with ?play=1, so the first thing a new user sees after their history
   * lands is their own year, not a screen they have to find the button on.
   */
  const [playing, setPlaying] = useState(autoplay);

  const holdRatio =
    winnerHold && loserHold && loserHold > 0.5 ? (winnerHold / loserHold).toFixed(1) : null;

  const stats = [
    {
      eyebrow: "Transactions read",
      value: transactionCount.toLocaleString("en-US"),
      unit: "rows",
      tail: "Pulled from your brokerage. You typed none of them.",
      tone: "ink" as const,
      type: "wrapped",
    },
    {
      eyebrow: "Average hold — winners",
      value: days(winnerHold),
      unit: "days",
      tail: loserHold
        ? `Your losers: ${days(loserHold)}. ${holdRatio ? `You hold what works ${holdRatio}× longer.` : "Both are short enough that the ratio would be noise."}`
        : "Not enough closed positions to compare yet.",
      tone: "moss" as const,
      type: "hold",
    },
    {
      eyebrow: "Sessions scored",
      value: String(scoredDays),
      unit: "days",
      tail: `Every one of them behind the ${score} you are carrying now.`,
      tone: "moss" as const,
      type: "score",
    },
    {
      eyebrow: "Best single decision",
      value: bestDecision ? usd(bestDecision.pnl) : "—",
      unit: "realised",
      tail: bestDecision
        ? `${bestDecision.symbol}, held ${days(bestDecision.holdDays)} days.`
        : "No closed round trips on file yet.",
      tone: "moss" as const,
      type: "hold",
    },
    {
      eyebrow: "Longest hold",
      value: longestHold ? days(longestHold.holdDays) : "—",
      unit: "days",
      tail: longestHold
        ? `${longestHold.symbol} — longer than most funds hold anything.`
        : "No closed round trips on file yet.",
      tone: "moss" as const,
      type: "hold",
    },
    {
      eyebrow: "Archetype",
      value: archetype.name.replace("The ", ""),
      unit: `${year}`,
      tail: archetype.line,
      tone: "signal" as const,
      type: "wrapped",
    },
  ];

  const story: StoryCard[] = [
    { eyebrow: `Bagcheck · ${year}`, value: String(scoredDays), tail: "sessions scored, and what you did on every one.", tone: "moss" },
    { eyebrow: "Transactions read", value: transactionCount.toLocaleString("en-US"), tail: "Pulled from your brokerage. You typed none of them.", tone: "ink" },
    { eyebrow: "Average hold — winners", value: days(winnerHold), tail: loserHold ? `Your losers: ${days(loserHold)} days.` : "Not enough closed positions to compare.", tone: "moss" },
    { eyebrow: "Best single decision", value: bestDecision ? usd(bestDecision.pnl) : "—", tail: bestDecision ? `${bestDecision.symbol}, held ${days(bestDecision.holdDays)} days.` : "No closed round trips yet.", tone: "moss" },
    { eyebrow: `Your ${year}`, value: archetype.name, tail: archetype.line, tone: "signal" },
  ];


  return (
    <>
      <ScreenHeader
        title="Wrapped"
        meta={`${year} · ${scoredDays} scored days · ${stats.length} cards`}
        score={score}
        delta={delta}
        syncedAt={syncedAt}
        tier={tier}
      />

      <div className={screen.body}>
        <div className={screen.grid}>
          <div className={screen.column}>
            <section data-reveal className={styles.hero}>
              <div className={styles.heroText}>
                <span className={styles.heroEyebrow}>Bagcheck · {year}</span>
                <Avatar archetype={archetype.key} size={72} />
                <h1 className={`num ${styles.heroTitle}`}>{archetype.name}</h1>
                <p className={styles.heroLine}>{archetype.line}</p>
                <button type="button" className={styles.play} onClick={() => setPlaying(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M7 4.6v14.8L19.4 12z" />
                  </svg>
                  Play your {year}
                </button>
              </div>

              {/*
                * The real card, not a preview of one. Same component the
                * marketing page renders, and the same figures that go on the
                * minted URL — what someone is shown here is what they post.
                */}
              <div className={styles.cardSlot}>
                <WrappedCard
                  eyebrow={cards[0].eyebrow}
                  kicker={cards[0].kicker}
                  headline={cards[0].headline}
                  lede={cards[0].lede}
                  body={cards[0].body}
                  slug={null}
                  provenance="Read from your brokerage. Read-only, permanently."
                  hue={cards[0].hue}
            layout={cards[0].layout}
                  rarity={cards[0].rarity}
                />
                <ShareButton type={cards[0].kind} label="this card" size={44} />
              </div>
            </section>

            <section data-reveal className={styles.statGrid} style={{ animationDelay: "0.05s" }}>
              {stats.map((stat) => (
                <div key={stat.eyebrow} className={screen.panel}>
                  <div className={screen.head}>
                    <span className={screen.eyebrow}>{stat.eyebrow}</span>
                    <div className={screen.spacer} />
                    <ShareButton type={stat.type} label={stat.eyebrow.toLowerCase()} />
                  </div>
                  <div className={styles.statValue}>
                    <span className="num">{stat.value}</span>
                    <span className={styles.unit}>{stat.unit}</span>
                  </div>
                  <p className={screen.tail}>{stat.tail}</p>
                </div>
              ))}
            </section>

            <section data-reveal className={screen.panel} style={{ animationDelay: "0.08s" }}>
              <Locked capability="reportCarousel" eyebrow="Carousel export">
                <div className={styles.carousel}>
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={styles.carouselCard} />
                  ))}
                </div>
              </Locked>
              <p className={screen.tail}>
                Plus renders the year as a carousel sized for a feed. The cards
                themselves are not paywalled — sharing never is. Only the format is.
              </p>
            </section>
          </div>

          <aside className={screen.rail}>
            <div className={screen.panel}>
              <span className={screen.eyebrow}>What Wrapped reads</span>
              <p className={screen.tail}>
                Every closed round trip, every scored day, and the hold times behind
                them. It is assembled from the ledger, so nothing here is a survey
                answer or an estimate.
              </p>
            </div>
          </aside>
        </div>
      </div>

      {playing ? <StoryViewer cards={story} art="/art/field-9x16.jpg" onClose={() => setPlaying(false)} /> : null}
    </>
  );
}
