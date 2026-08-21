import type { Metadata } from "next";
import Link from "next/link";
import { TRIAL_DAYS, priceAmount } from "@/lib/tiers";
import { POLICY_UPDATED, contactEmail } from "../contact";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Terms",
  description:
    "The terms of using Supercruise: what it is, what it explicitly is not, how the plan works, and how to leave.",
};

export const dynamic = "force-dynamic";

/**
 * Terms of service.
 *
 * The section that matters most on a product like this is the second one.
 * Supercruise describes what someone already did; it is not advice, and saying
 * so in one unambiguous paragraph is worth more than ten of boilerplate.
 */
export default function TermsPage() {
  const email = contactEmail();

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <span className={styles.eyebrow}>Legal</span>
        <h1 className={`disp ${styles.title}`}>Terms</h1>
        <span className={styles.updated}>Last updated {POLICY_UPDATED}</span>

        <p className={styles.lede}>
          These terms cover your use of Supercruise. Using the product means you
          accept them. They are written to be read.
        </p>

        <section className={styles.section}>
          <h2>What Supercruise is</h2>
          <p>
            Supercruise connects to your brokerage through SnapTrade, read-only,
            and describes what you did with it: a daily score, the patterns your
            own history contains, and a set of cards you can share. It is a
            record and a mirror.
          </p>
        </section>

        <section className={styles.section}>
          <h2>What Supercruise is not</h2>
          <p>
            <strong>
              Nothing in Supercruise is financial, investment, tax or legal advice.
            </strong>{" "}
            It does not recommend a security, a trade, an allocation or a
            strategy, and it does not tell you what to do next. It is not a
            broker-dealer or an investment adviser, it is not regulated as one,
            and it holds no discretion over any account.
          </p>
          <p>
            It cannot place, cancel or modify an order — the connection is
            read-only at the source. Past behaviour, including anything a score
            or a card says about it, does not predict future results. Decisions
            you make about your money are yours.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Your account</h2>
          <p>
            You need a Google account to sign in and you must be 18 or older.
            Keep your sign-in secure — anyone with it can see everything
            Supercruise holds about you. One person per account.
          </p>
          <p>
            Do not attempt to reach another person&rsquo;s data, disrupt the
            service, scrape it at volume, or work around the paid formats. We
            may suspend an account doing any of those.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Your data and your cards</h2>
          <p>
            Your brokerage history is yours. Supercruise stores and processes it to
            run the product, as described in the{" "}
            <Link href="/legal/privacy">privacy policy</Link>. You keep every
            right you already had in it.
          </p>
          <p>
            A card you mint is yours to post anywhere, with no attribution
            required and no restriction on where. Minting and sharing are free
            on every plan, including scarce cards. The card templates, the
            artwork behind them, the wordmark and the product itself remain
            ours.
          </p>
          <p>
            A minted card is public to anyone holding its link. Share one and
            you are publishing the figures on it — that is the point of it, and
            it is your decision each time.
          </p>
        </section>

        <section className={styles.section}>
          <h2>The plan</h2>
          <p>
            Supercruise is a subscription. Connecting a brokerage opens{" "}
            {TRIAL_DAYS} days of the whole product with no card required; when
            that window closes, reading your ledger here needs an active plan
            at ${priceAmount()} a month, billed by Stripe. Two things
            do not depend on the plan and never will: a card you minted stays
            live at the URL it was minted at, and exporting or deleting
            everything we hold about you stays available from your profile
            whether or not you are subscribed.
          </p>
          <p>
            A subscription renews monthly until you cancel. Cancel any time from
            your profile — Stripe handles it directly, and access runs to the end
            of the period you have already paid for. We do not pro-rate a
            partial month, and if we ever raise the price we will say so before
            it takes effect.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Third parties</h2>
          <p>
            Supercruise depends on SnapTrade, your broker, Stripe, Google and the
            data providers named in the privacy policy. If one of them is down,
            changes what it returns, or ends its relationship with us, parts of
            Supercruise stop working, and that is outside our control. Your
            agreement with your broker is between you and them.
          </p>
          <p>
            Market data shown in Supercruise is used only to correct a stale mark
            from your broker; the broker stays the account of record. Figures
            here are not a statement, are not audited, and should not be used
            for tax filing.
          </p>
        </section>

        <section className={styles.section}>
          <h2>No warranty</h2>
          <p>
            Supercruise is provided as it is. We do not warrant that it will be
            uninterrupted, that a computed figure is free of error, or that it
            fits a particular purpose. Where the ledger cannot answer something
            honestly the product shows nothing rather than a guess, but a bug is
            always possible — tell us and we will fix it.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Limits</h2>
          <p>
            To the extent the law allows, Supercruise is not liable for indirect or
            consequential loss, or for investment losses. Our total liability to
            you is capped at what you have paid us in the twelve months before
            the claim. Nothing here limits liability that cannot be limited by
            law.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Ending it</h2>
          <p>
            Delete your account from your profile at any time and everything
            goes with it, in one action. We may close an account that breaks
            these terms, and will say why where we are able to.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Changes</h2>
          <p>
            If these terms change, the date at the top changes. A material
            change will be sent to the address on your account before it takes
            effect.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Contact</h2>
          <p>
            <a href={`mailto:${email}`}>{email}</a>
          </p>
        </section>

        <Link href="/" className={styles.back}>
          Back to the landing page
        </Link>
      </div>
    </main>
  );
}
