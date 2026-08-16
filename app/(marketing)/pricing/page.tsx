import type { Metadata } from "next";
import Link from "next/link";
import { getUserId } from "@/auth";
import { isDbConfigured, tierFor } from "@/lib/db";
import { isStripeConfigured } from "@/lib/billing";
import {
  CAPABILITY_LABEL,
  FREE_ALWAYS,
  TIER_PRICE,
  TRIAL_DAYS,
  type Tier,
} from "@/lib/tiers";
import { MarketingFooter, MarketingNav } from "../Chrome";
import { PricingCta } from "./PricingCta";
import landing from "../landing.module.css";
import styles from "../pricing.module.css";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Bagcheck is free to use and $9 a month to publish. Every card your behaviour earns is yours to post on either plan, rare ones included.",
};

/*
 * The plan is read per request, so a subscriber never sees a button that
 * would sell them what they already have.
 */
export const dynamic = "force-dynamic";

function Check({ tone }: { tone: "green" | "white" }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke={tone === "green" ? "var(--mk-green-soft)" : "var(--mk-bg)"}
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 12.5l5 5L20 6.5" />
    </svg>
  );
}

/* The plain answers, in the order someone about to pay would ask them. */
const QA: Array<[string, string]> = [
  [
    "What do I get without paying?",
    "The whole product. Every card your behaviour earns, the score and its four components, your ledger, and sharing at full quality. Pro adds export formats, not access.",
  ],
  [
    "Are the rare cards paid?",
    "No. Rarity is earned and never sold — the code has no way to gate a card by plan, which is deliberate rather than a promise.",
  ],
  [
    `What happens after the ${TRIAL_DAYS} days?`,
    "The paid formats lock and everything else keeps working. Anything you minted during the window stays yours, at the URL it was minted at.",
  ],
  [
    "Can I cancel?",
    "Any time, from your profile. Stripe handles it directly and the plan runs to the end of the period you have already paid for.",
  ],
  [
    "Does bagcheck touch my money?",
    "No. The brokerage connection is read-only through SnapTrade — bagcheck can see what you did and cannot place a trade, move a dollar, or hold a credential.",
  ],
  [
    "Can I delete it all?",
    "Yes. Deleting your account removes the ledger, the scores and the connection from our store in one action.",
  ],
];

export default async function PricingPage() {
  /*
   * Three states, three buttons: signed out goes to the connect flow, a free
   * account starts a checkout in place, and a subscriber is told they are on
   * it rather than sold it again.
   */
  const userId = await getUserId();
  let tier: Tier = "free";
  if (userId && isDbConfigured()) tier = await tierFor(userId);
  const canCheckout = Boolean(userId) && isStripeConfigured() && isDbConfigured();

  return (
    <main className={landing.page}>
      <MarketingNav current="pricing" />

      <section className={styles.head}>
        <div className={styles.headCopy}>
          <span className={styles.eyebrow}>PRICING</span>
          <h1 className={styles.h1}>Free to use. Nine dollars to publish.</h1>
        </div>
        <p className={styles.lede}>
          Bagcheck reads your brokerage and turns the year into something worth
          posting. That part is free and stays free. Pro is for the formats —
          publication-size exports, the carousel, a live badge — and it is the
          only thing there is to buy.
        </p>
      </section>

      <section className={styles.plans}>
        <div className={styles.glow} aria-hidden="true" />
        <div className={styles.inner}>
          <div className={styles.cards}>
            <div className={styles.card}>
              <span className={styles.label}>FREE</span>
              <div className={styles.price}>
                <b>$0</b>
                <span>forever</span>
              </div>
              <p className={styles.note} data-mute="">
                No card to start
              </p>
              <ul className={styles.list}>
                {FREE_ALWAYS.map((f) => (
                  <li key={f}>
                    <Check tone="green" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href={userId ? "/you" : "/start"} className={styles.cta}>
                {userId ? "Open your dashboard" : "Connect a brokerage"}
              </Link>
            </div>

            <div className={styles.card} data-paid="">
              <span className={styles.flag}>
                <i />
                {TRIAL_DAYS} DAYS FREE
              </span>
              <span className={styles.label}>PRO</span>
              <div className={styles.price}>
                <b>${TIER_PRICE.pro.monthly}</b>
                <span>/mo</span>
              </div>
              <p className={styles.note}>
                Everything free has, plus every format below
              </p>
              <ul className={styles.list}>
                {Object.values(CAPABILITY_LABEL).map((f) => (
                  <li key={f}>
                    <Check tone="white" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {tier !== "free" ? (
                <Link href="/profile" className={styles.cta} data-solid="">
                  You are on Pro — manage it
                </Link>
              ) : canCheckout ? (
                <PricingCta label="Go Pro" />
              ) : (
                <Link href="/start" className={styles.cta} data-solid="">
                  Connect a brokerage first
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/*
       * The half of a pricing page that usually goes unsaid. These three are
       * structural rather than promised: the capability model has no member
       * for minting, rarity or sharing, so a gate against them cannot be
       * written, and the brokerage connection is read-only at the source.
       */}
      <section className={styles.never}>
        <div className={styles.neverInner}>
          <div className={styles.neverItem}>
            <h3>Sharing is never paid</h3>
            <p>
              Minting and posting a card take no plan and never will. The gating
              code has no way to express it.
            </p>
          </div>
          <div className={styles.neverItem}>
            <h3>Rarity is earned</h3>
            <p>
              A scarce card comes off your ledger. There is no plan that mints
              one and no plan that withholds one.
            </p>
          </div>
          <div className={styles.neverItem}>
            <h3>Read-only, permanently</h3>
            <p>
              Bagcheck describes what you did. It never places a trade, never
              recommends one, and never sends a price alert.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.faq}>
        <div className={styles.faqInner}>
          <span className={styles.faqHead}>THE PLAIN ANSWERS</span>
          <dl className={styles.qa}>
            {QA.map(([q, a]) => (
              <div key={q}>
                <dt>{q}</dt>
                <dd>{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
