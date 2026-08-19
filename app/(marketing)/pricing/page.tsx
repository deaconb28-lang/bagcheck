import type { Metadata } from "next";
import Link from "next/link";
import { getUserId } from "@/auth";
import { isDbConfigured, tierFor } from "@/lib/db";
import { isStripeConfigured } from "@/lib/billing";
import {
  CAPABILITY_LABEL,
  PLAN_INCLUDES,
  priceLine,
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
    "Thirty days free, no card. Then $14.99 a month.",
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
    "What do I get during the free month?",
    "All of it. Nothing is held back for the paid month, because there is nothing else to show you.",
  ],
  [
    "Are the rare cards paid?",
    "No. The code has no way to gate a card by plan — that is structural, not a promise.",
  ],
  [
    `What happens after the ${TRIAL_DAYS} days?`,
    "Reading your ledger needs a plan. Minted cards stay live either way, and export and deletion stay open.",
  ],
  [
    "Can I cancel?",
    "Any time, from your profile. It runs to the end of the period you paid for.",
  ],
  [
    "Does steadyhands touch my money?",
    "No. Read-only through SnapTrade — it cannot trade, move a dollar, or hold a credential.",
  ],
  [
    "Can I delete it all?",
    "Yes. One action removes the ledger, the scores and the connection.",
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
          <h1 className={styles.h1}>Thirty days free. Then fifteen a month.</h1>
        </div>
        <p className={styles.lede}>
          The first {TRIAL_DAYS} days are free and take no card. After that it
          is {priceLine()} — one plan, everything in it.
        </p>
      </section>

      <section className={styles.plans}>
        <div className={styles.glow} aria-hidden="true" />
        <div className={styles.inner}>
          <div className={styles.cards}>
            <div className={styles.card} data-paid="">
              <span className={styles.flag}>
                <i />
                {TRIAL_DAYS} DAYS FREE
              </span>
              <span className={styles.label}>STEADYHANDS</span>
              <div className={styles.price}>
                <b>${TIER_PRICE.pro.monthly}</b>
                <span>/mo</span>
              </div>
              <p className={styles.note}>
                {TRIAL_DAYS} days free, no card. Then {priceLine()}.
              </p>
              {/*
                * One list, because there is one plan. This was two cards —
                * FREE at $0 forever beside PRO — and both halves of that are
                * now untrue: there is no free tier, and the paid one is not a
                * set of extra formats bolted onto it. A pricing page that
                * still showed a free column would be selling something the
                * gates do not deliver, which is the one thing a paywall must
                * never do.
                */}
              <ul className={styles.list}>
                {PLAN_INCLUDES.map((f) => (
                  <li key={f}>
                    <Check tone="green" />
                    <span>{f}</span>
                  </li>
                ))}
                {Object.values(CAPABILITY_LABEL).map((f) => (
                  <li key={f}>
                    <Check tone="white" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {tier !== "free" ? (
                <Link href="/profile" className={styles.cta} data-solid="">
                  You are subscribed — manage it
                </Link>
              ) : canCheckout ? (
                <PricingCta label="Subscribe" />
              ) : (
                <Link href={userId ? "/start" : "/start"} className={styles.cta} data-solid="">
                  Start your {TRIAL_DAYS} days
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
              The gating code has no way to express it.
            </p>
          </div>
          <div className={styles.neverItem}>
            <h3>Rarity is earned</h3>
            <p>
              A scarce card comes off your ledger, not off a plan.
            </p>
          </div>
          <div className={styles.neverItem}>
            <h3>Read-only, permanently</h3>
            <p>
              It never places a trade, recommends one, or sends a price alert.
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
