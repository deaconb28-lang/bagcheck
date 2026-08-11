import Link from "next/link";
import { getUserId } from "@/auth";
import { isDbConfigured } from "@/lib/db";
import { buildCards } from "@/lib/cards";
import { exampleLedger } from "@/lib/cards/exampleLedger";
import { assembleWrapped } from "@/lib/wrapped/assemble";
import { BagMark } from "@/app/(marketing)/BagMark";
import { WrappedDeck } from "./WrappedDeck";
import shell from "../flex.module.css";
import styles from "./wrapped.module.css";

export const dynamic = "force-dynamic";

/**
 * Step two: your year, as twelve cards.
 *
 * Three ways in, and each one lands on a real deck rather than an apology.
 * A connected account gets its own cards. `?demo=1` gets the example ledger,
 * built by the same twelve kinds with the same sample floors, and every card
 * says "Example" on its face. Someone signed in with nothing synced yet is
 * sent back to step one, because the next move is a brokerage rather than a
 * message.
 *
 * A kind below its sample floor is absent, never a zero — so the deck is
 * "the cards your year earned", which is a shorter and more honest sentence
 * than twelve cards where four of them are empty.
 */
export default async function WrappedPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>;
}) {
  const { demo } = await searchParams;
  const userId = await getUserId();
  const year = new Date().getUTCFullYear();

  const assembled =
    demo === "1" || !userId || !isDbConfigured() ? null : await assembleWrapped(userId);

  const example = !assembled;
  const cards = assembled?.cards ?? buildCards(exampleLedger(year));

  /* Signed in, connected, but nothing cleared a floor — step one, not a wall. */
  if (!example && cards.length === 0) {
    return (
      <>
        <Header />
        <main className={styles.empty}>
          <h1 className={styles.emptyTitle}>No card has been earned yet</h1>
          <p className={styles.emptyBody}>
            Cards are built from behaviour the ledger can prove, so a year with
            too little history in it stays quiet rather than inventing one. Sync
            more history, or read the sample year to see what arrives.
          </p>
          <div className={styles.emptyActions}>
            <Link className={styles.primary} href="/start">
              Connect another account
            </Link>
            <Link className={styles.secondary} href="/wrapped?demo=1">
              See a sample year
            </Link>
          </div>
        </main>
      </>
    );
  }

  const label = assembled?.label ?? String(year);
  const provenance = example
    ? "Example ledger · not anyone's record"
    : "Read-only brokerage data via SnapTrade";

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.head}>
          <span className={styles.eyebrow}>{example ? "SAMPLE YEAR" : `YOUR ${label} WRAPPED`}</span>
          <h1 className={styles.h1}>
            {example ? "This is what your year looks like." : "Here is your year."}
          </h1>
          <p className={styles.lede}>
            {example
              ? "Built by the same rules your own year runs through. Every figure here comes from an example ledger and says so on the card."
              : "Every card your year earned, each one a thing your ledger did. Post any of them — sharing is never behind a plan."}
          </p>
          {example ? (
            <Link className={styles.headCta} href="/start">
              Connect a brokerage
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h13" />
                <path d="M12 5l7 7-7 7" />
              </svg>
            </Link>
          ) : null}
        </div>

        <WrappedDeck cards={cards} example={example} provenance={provenance} />
      </main>
    </>
  );
}

function Header() {
  return (
    <header className={shell.bar}>
      <Link href="/" className={shell.brand}>
        <BagMark size={26} />
        <span className={shell.wordmark}>bagcheck</span>
      </Link>
      <span className={shell.barNote}>Step 2 of 2</span>
    </header>
  );
}
