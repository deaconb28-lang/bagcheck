import Link from "next/link";
import styles from "./wrappedReady.module.css";

/**
 * The year is ready, said on the screen the reader is already on.
 *
 * This is the product's one shot at an a-ha inside five minutes. A reader who
 * has just connected a brokerage has a deck waiting for them — built by the
 * sync itself rather than by whoever opens `/wrapped` first — and nothing on
 * the dashboard said so. They landed on a screen full of instrumentation and
 * had to discover the one artefact worth showing anybody.
 *
 * **It is a notification, which means it stops.** `wrappedOpenedAt` is set the
 * first time they open the deck and this never renders again. A banner that
 * keeps announcing something you have already seen is an advert.
 *
 * It states the count and nothing else it cannot stand behind: `earned` is how
 * many cards the ledger has actually proved, so an account three days old is
 * told the truth about how much of its year exists rather than being sold
 * twelve cards that are mostly locked.
 */
export function WrappedReady({ year, earned, total }: { year: number; earned: number; total: number }) {
  return (
    <section className={styles.note} data-empty={earned === 0 || undefined} data-reveal aria-live="polite">
      <span className={styles.spark} aria-hidden="true">
        {/* The dart, arriving. The mark as the messenger. */}
        <svg viewBox="0 0 34 34" width="26" height="26" fill="none" aria-hidden="true">
          <path d="M28 5.6 L9.6 16.8 L16.7 19.2 L17.3 26.4 Z" fill="currentColor" />
          <path d="M13.4 22.8 L7.2 29" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M8.4 18.8 L3 24.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" />
        </svg>
      </span>

      <div className={styles.body}>
        {/*
          * Zero earned is a state, not a reason to disappear.
          *
          * The block was gated on `earned > 0`, so an account that had minted
          * nothing saw no Wrapped on the dashboard at all — and the commonest
          * way to have minted nothing is to have connected recently or to
          * have a sync that has not landed, which is precisely when a reader
          * most wants to know the thing exists and what fills it. An absent
          * block reads as a missing feature; a block stating its own
          * condition reads as a product waiting on data.
          */}
        <p className={styles.eyebrow}>
          {earned > 0 ? `Your ${year} Wrapped is ready` : `Your ${year} Wrapped is filling in`}
        </p>
        <p className={styles.line}>
          {earned > 0 ? (
            <>
              <span className={`num ${styles.count}`}>{earned}</span> of {total} cards, straight
              off what your brokerage just handed over.
            </>
          ) : (
            <>
              None of the {total} cards have been earned yet. Each one mints itself off your
              ledger as the year gives it something to say.
            </>
          )}
        </p>
      </div>

      <Link href="/wrapped" className={styles.open}>
        Open it
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14" />
          <path d="M13 5l7 7-7 7" />
        </svg>
      </Link>
    </section>
  );
}
