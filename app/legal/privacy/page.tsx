import type { Metadata } from "next";
import Link from "next/link";
import { POLICY_UPDATED, contactEmail } from "../contact";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Bagcheck reads from your brokerage, where it is stored, who else sees it, and how to get it back or delete it.",
};

export const dynamic = "force-dynamic";

/**
 * The privacy policy.
 *
 * Written against what the code actually does rather than against a template:
 * every claim here is checkable in this repository, which is the only reason
 * a policy on a product that reads someone's brokerage is worth anything.
 */
export default function PrivacyPage() {
  const email = contactEmail();

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <span className={styles.eyebrow}>Legal</span>
        <h1 className={`disp ${styles.title}`}>Privacy</h1>
        <span className={styles.updated}>Last updated {POLICY_UPDATED}</span>

        <p className={styles.lede}>
          Bagcheck reads your brokerage history and turns it into a score and a
          set of shareable cards. That means it holds a detailed record of how
          you invest, so this page states plainly what is stored, who else can
          see it, and how to take it back.
        </p>

        <section className={styles.section}>
          <h2>What is collected</h2>
          <ul>
            <li>
              <strong>Your account.</strong> When you sign in with Google we
              receive your name, email address and profile picture. We do not
              receive or store your Google password.
            </li>
            <li>
              <strong>Your brokerage data.</strong> Through SnapTrade, and only
              after you authorise it: the accounts you connect, their positions
              and balances, and their transaction history — the fills, transfers
              and dividends the broker reports.
            </li>
            <li>
              <strong>What we compute from it.</strong> Daily scores and their
              components, round trips matched first-in-first-out, daily and
              realised profit and loss, holding periods, and the patterns the
              engine draws from them.
            </li>
            <li>
              <strong>What you tell us.</strong> The reason you attach to an
              entry when you tag it, your declared investing style, your email
              preferences and your light or dark mode choice.
            </li>
            <li>
              <strong>Cards you mint.</strong> The figures printed on a card and
              the random slug it lives at.
            </li>
            <li>
              <strong>Billing.</strong> If you subscribe, a Stripe customer and
              subscription identifier, the plan, its status and its renewal
              date. Card numbers never reach us — Stripe holds those.
            </li>
          </ul>
          <p>
            Bagcheck never receives a brokerage password. The connection is made
            through SnapTrade and is read-only: it can see what you did and
            cannot place, cancel or modify an order.
          </p>
        </section>

        <section className={styles.section}>
          <h2>What it is used for</h2>
          <p>
            To run the product you asked for: computing your score, drawing your
            screens, minting the cards you share, sending the emails you have
            turned on, and billing you if you subscribe. Nothing else.
          </p>
          <p>
            Your data is not sold, and it is not shared with advertisers or data
            brokers. Aggregate comparisons against other people are not part of
            the product today; if that changes, this page changes with it and
            the comparison stays aggregate.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Who else sees it</h2>
          <p>
            A handful of services do specific jobs, and each sees only what that
            job needs:
          </p>
          <ul>
            <li>
              <strong>SnapTrade</strong> brokers the read-only connection to your
              broker.
            </li>
            <li>
              <strong>MongoDB Atlas</strong> stores everything above.
            </li>
            <li>
              <strong>Railway</strong> runs the application.
            </li>
            <li>
              <strong>Google</strong> handles sign-in.
            </li>
            <li>
              <strong>Stripe</strong> handles payments and holds your card
              details.
            </li>
            <li>
              <strong>Resend</strong> delivers email, and therefore sees your
              address and the text of what is sent.
            </li>
            <li>
              <strong>Anthropic</strong> writes the one daily sentence. It is
              sent a fact pack of computed numbers — the score, its four
              components, what moved them, your transaction and account counts —
              and no name, no email, no ticker and no dollar figure.
            </li>
            <li>
              <strong>OpenAI</strong> writes the one caption on each Wrapped
              card. Each card is sent only the figures printed on that card, so
              across a year that includes your first name on the cover card and
              the ticker symbols of your longest hold and your strongest name.
              It is never sent your email, your account numbers, your
              brokerage&rsquo;s name, your holdings list or any dollar figure,
              and it is never sent the whole set at once — a card&rsquo;s
              request carries that card&rsquo;s figures and nothing else.
              Nothing it returns can change a number: every figure on a card is
              set by us and checked character for character against our own
              computation before the card is shown, and a card whose text
              disagreed is thrown away and written by us instead.
            </li>
            <li>
              <strong>Finnhub</strong> and the logo sources receive ticker
              symbols in order to return a quote or a company mark. They are not
              told whose symbols they are.
            </li>
          </ul>
          <p>
            No analytics or advertising trackers run on this site, and no fonts
            are fetched from anyone else — every face is served from this
            domain. Image models drew the card artwork before launch, once, for
            everyone; nothing about you is sent to one.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Cards are public by their link</h2>
          <p>
            A card you mint lives at a URL containing 96 bits of randomness.
            Anyone with that link can see the card — that is what makes it
            shareable — but the link cannot be guessed and nothing else about
            your account is reachable from it. Deleting your account stops those
            links resolving.
          </p>
        </section>

        <section className={styles.section}>
          <h2>How long it is kept</h2>
          <p>
            For as long as your account exists. Delete the account and the
            ledger, the scores, the derived history, the tags, the minted cards,
            the badge and the sign-in records go with it, in one action, with no
            waiting period. Backups held by our storage provider roll off on
            their own schedule.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Taking it back</h2>
          <p>
            Both of these are buttons rather than requests, on your{" "}
            <Link href="/profile">profile</Link>:
          </p>
          <ul>
            <li>
              <strong>Export.</strong> Everything stored about you, as one JSON
              file, in the shape it is stored in.
            </li>
            <li>
              <strong>Delete.</strong> Erases the account and cancels a running
              subscription. It cannot be undone.
            </li>
          </ul>
          <p>
            If you are in a jurisdiction with a statutory right of access,
            correction, portability or erasure — the UK and EU under GDPR,
            California under the CCPA, and others — those two buttons are how
            those rights are exercised here, and you can also write to{" "}
            <a href={`mailto:${email}`}>{email}</a>.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Security</h2>
          <p>
            Traffic is encrypted in transit. Credentials for every service above
            are held as server-side environment variables and are never sent to
            the browser. No product can promise it cannot be breached; what this
            one can say is that it holds no brokerage password, no card number
            and no ability to move your money.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Children</h2>
          <p>
            Bagcheck is not for anyone under 18, and accounts are not knowingly
            created for them.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Changes</h2>
          <p>
            If this policy changes, the date at the top changes. A change that
            materially affects what is collected or who sees it will be sent to
            the address on your account.
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
