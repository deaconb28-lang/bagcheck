"use client";

import { useState } from "react";
import { Avatar } from "@/components/primitives";
import type { Archetype } from "@/lib/archetypes";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { ShareButton } from "@/components/app/ShareButton";
import { StoryViewer } from "@/components/cards/StoryViewer";
import { WrappedCard } from "@/components/cards/WrappedCard";
import type { CardSpec } from "@/lib/cards/kinds";
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
  /** Slug of the hero card if it has already been minted, so its art shows. */
  mintedSlug?: string | null;
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
    mintedSlug = null,
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

  return (
    <>
      <ScreenHeader
        title="Wrapped"
        meta={`${year} · ${scoredDays} scored days · ${cards.length} cards`}
        score={score}
        delta={delta}
        syncedAt={syncedAt}
        tier={tier}
      />

      <div className={screen.body}>
        <div className={screen.column}>
          {/*
            * The screen is an invitation, not a dashboard. One poster, and the
            * thing it wants you to do is press play — a Wrapped that opens on
            * a grid of cards has already spent the moment it exists to create.
            */}
          <section data-reveal className={styles.poster}>
            <img
              className={styles.posterArt}
              src={`/cards/${cards[0].kind}.jpg`}
              alt=""
              aria-hidden="true"
            />
            <div className={styles.posterWash} aria-hidden="true" />

            <div className={styles.posterBody}>
              <span className={styles.heroEyebrow}>Bagcheck · {year}</span>
              <Avatar archetype={archetype.key} size={80} />
              <h1 className={`num ${styles.heroTitle}`}>{archetype.name}</h1>
              <p className={styles.heroLine}>{archetype.line}</p>

              <button type="button" className={styles.play} onClick={() => setPlaying(true)}>
                <span className={styles.playMark} aria-hidden="true">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7 4.6v14.8L19.4 12z" />
                  </svg>
                </span>
                Play your {year}
              </button>

              <span className={styles.posterMeta}>
                {cards.length} {cards.length === 1 ? "card" : "cards"} · {scoredDays} scored{" "}
                {scoredDays === 1 ? "session" : "sessions"} · {transactionCount.toLocaleString("en-US")} transactions
              </span>
            </div>
          </section>

          {/* The deck, at card size. Every one of them is postable on its own. */}
          <section data-reveal className={styles.deck} style={{ animationDelay: "0.05s" }}>
            {cards.map((card) => (
              <div key={card.kind} className={styles.deckItem}>
                <WrappedCard
                  eyebrow={card.eyebrow}
                  kicker={card.kicker}
                  headline={card.headline}
                  lede={card.lede}
                  body={card.body}
                  slug={null}
                  symbol={card.symbol}
                  backdrop={`/cards/${card.kind}.jpg`}
                  provenance={`Bagcheck · ${year} · read from your brokerage`}
                  hue={card.hue}
                  layout={card.layout}
                  rarity={card.rarity}
                />
                <ShareButton type={card.kind} label={card.headline.toLowerCase()} size={40} />
              </div>
            ))}
          </section>
        </div>
      </div>

      {playing ? (
        <StoryViewer cards={cards} year={year} onClose={() => setPlaying(false)} />
      ) : null}
    </>
  );
}
