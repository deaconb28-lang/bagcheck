"use client";

import { useState } from "react";
import { TIER_LABEL } from "@/lib/billing/tiers";
import type { Feature, Tier } from "@/lib/billing/tiers";
import { Eyebrow, Icon } from "@/components/primitives";
import styles from "./marketing.module.css";

/**
 * The three tiers, with the billing period the reader chooses.
 *
 * Each paid line names a real `Feature` from lib/billing/tiers, so the page
 * cannot drift from what the entitlement model actually grants. Nothing on
 * the free column carries one: minting and rarity have no Feature member,
 * which is the whole point — they are ungateable by construction.
 */

interface TierLine {
  name: string;
  detail: string;
  /** The entitlement this line describes, where there is one. */
  feature?: Feature;
}

interface TierCopy {
  tier: Tier;
  monthly: number;
  /** Null on free — there is no annual price for nothing. */
  yearly: number | null;
  who: string;
  lines: TierLine[];
}

const TIERS: TierCopy[] = [
  {
    tier: "free",
    monthly: 0,
    yearly: null,
    who: "Anyone with a brokerage",
    lines: [
      {
        name: "The Discipline score",
        detail: "What moved it, and one written sentence a day about why.",
      },
      {
        name: "Streaks, Wrapped and event segments",
        detail: "The whole set. None of it is held back for a paid tier.",
      },
      {
        name: "Every rare card you earn",
        detail: "Rarity is decided by your conduct, never by your plan.",
      },
    ],
  },
  {
    tier: "plus",
    monthly: 9,
    yearly: 86,
    who: "People who write about investing",
    lines: [
      {
        name: "Report carousels",
        detail: "A quarter of findings as a set of cards, sized for a feed.",
        feature: "reportCarousel",
      },
      {
        name: "Correlation cards",
        detail: "One pattern the engine found, drawn as a single statement.",
        feature: "correlationCard",
      },
      {
        name: "Publication exports and embeds",
        detail: "Print-resolution files, and a live block for your own site.",
        feature: "publicationExport",
      },
      {
        name: "A live score badge",
        detail: "Your current score, updating wherever you paste it.",
        feature: "liveBadge",
      },
    ],
  },
  {
    tier: "trader",
    monthly: 29,
    yearly: 278,
    who: "Active day and swing traders",
    lines: [
      {
        name: "Daily session recap cards",
        detail: "One card a session, minted from what you actually did.",
        feature: "sessionRecapCard",
      },
      {
        name: "Motion exports",
        detail: "The same cards as short video, for the platforms that want it.",
        feature: "motionExport",
      },
      {
        name: "A verified track record",
        detail: "A public page standing on read-only brokerage data.",
        feature: "verifiedTrackRecord",
      },
      {
        name: "Everything in Plus",
        detail: "Trader is Plus with a daily cadence, not a separate product.",
      },
    ],
  },
];

const PERIODS = [
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
] as const;

/**
 * `glyphs` is a prop rather than an iconsEnabled() call because this is a
 * client component: the Noun Project key is not NEXT_PUBLIC, so asking here
 * would always answer no. The server page asks and passes the answer down.
 */
export function PricingTiers({ glyphs = false }: { glyphs?: boolean }) {
  const [yearly, setYearly] = useState(false);

  return (
    <div className={styles.tierBlock}>
      <div className={styles.periodRow}>
        <div className={styles.periodToggle} role="group" aria-label="Billing period">
          {PERIODS.map((period) => (
            <button
              key={period.id}
              type="button"
              className={styles.period}
              aria-pressed={yearly === (period.id === "yearly")}
              onClick={() => setYearly(period.id === "yearly")}
            >
              {period.label}
            </button>
          ))}
        </div>
        <p className={styles.periodNote}>
          {yearly ? "Billed once a year · 20% under monthly" : "Billed monthly · cancel any time"}
        </p>
      </div>

      <div className={styles.tierCols}>
        {TIERS.map((tier) => {
          const price = yearly && tier.yearly != null ? tier.yearly : tier.monthly;
          const unit = tier.monthly === 0 ? null : yearly ? "/year" : "/mo";

          return (
            <div key={tier.tier} className={styles.tierCol}>
              <div className={styles.tierHead}>
                <span className={styles.tierMark}>
                  {glyphs ? <Icon name={tier.tier} size={18} /> : null}
                  <Eyebrow>{TIER_LABEL[tier.tier]}</Eyebrow>
                </span>
                <div className={`num ${styles.tierPrice}`}>
                  ${price}
                  {unit ? <span className={styles.tierUnit}>{unit}</span> : null}
                </div>
                <p className={styles.tierWho}>{tier.who}</p>
              </div>
              <ul className={styles.tierList}>
                {tier.lines.map((line) => (
                  <li key={line.name}>
                    <span className={styles.tierLineName}>{line.name}</span>
                    <span className={styles.tierLineDetail}>{line.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
