import Link from "next/link";
import { getUserId } from "@/auth";
import { isDbConfigured } from "@/lib/db";
import { buildCards } from "@/lib/cards";
import { exampleLedger } from "@/lib/cards/exampleLedger";
import { assembleWrapped } from "@/lib/wrapped/assemble";
import { storedPhotos } from "@/lib/unsplash";
import { BagMark } from "@/app/(marketing)/BagMark";
import { WrappedDeck } from "./WrappedDeck";
import styles from "./wrapped.module.css";

export const dynamic = "force-dynamic";

/**
 * Step two: your year, as cards.
 *
 * **The cards start at the top of the screen.** The first build opened with
 * an eyebrow, a headline, a paragraph and a full-width white button, so on a
 * phone the first card began somewhere past a thousand pixels down — a page
 * about cards where the cards were below the fold. All of that is now a
 * single line of chrome across the top, and the deck begins immediately.
 *
 * What was the loudest thing on the screen is now the quietest: connecting a
 * brokerage is a link at the foot, because a white button competing with
 * twelve saturated posters wins, and it should not.
 *
 * Three ways in, each landing on a real deck. A connected account gets its
 * own cards; `?demo=1` gets the example ledger with "Example" on every card;
 * someone with nothing synced is sent back to step one, because the next
 * move there is a brokerage rather than a message.
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
  /*
   * Read-only, and never a call to Unsplash: rendering a page must not spend
   * quota. An empty store just means the cards wear their drawn artwork.
   */
  const photos = await storedPhotos();

  if (!example && cards.length === 0) {
    return (
      <>
        <Bar label={String(year)} />
        <main className={styles.empty}>
          <h1 className={styles.emptyTitle}>No card has been earned yet</h1>
          <p className={styles.emptyBody}>
            Cards are built from behaviour the ledger can prove, so a year with
            too little history stays quiet rather than inventing one. Sync more
            history, or read the sample year to see what arrives.
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
      <Bar label={label} example={example} />
      <main className={styles.main}>
        <WrappedDeck cards={cards} example={example} provenance={provenance} photos={photos} />

        {/*
          * The tail. Everything that is not a card lives below the deck, in
          * one quiet row — the reader came for the cards and gets them first.
          */}
        <footer className={styles.tail}>
          {example ? (
            <>
              <p>
                These figures come from an example ledger and say so on every
                card. Connect a brokerage to get your own.
              </p>
              <Link className={styles.tailCta} href="/start">
                Connect a brokerage
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h13" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </Link>
            </>
          ) : (
            <p>
              Every card your year earned, built from read-only brokerage data.
              Sharing is never behind a plan.
            </p>
          )}
        </footer>
      </main>
    </>
  );
}

/** One line of chrome. The mark, what you are reading, and the way out. */
function Bar({ label, example }: { label: string; example?: boolean }) {
  return (
    <header className={styles.bar}>
      <Link href="/" className={styles.brand} aria-label="bagcheck home">
        <BagMark size={24} />
        <span>bagcheck</span>
      </Link>
      <span className={styles.barLabel}>
        {example ? "Sample year" : "Wrapped"} · {label}
      </span>
    </header>
  );
}
