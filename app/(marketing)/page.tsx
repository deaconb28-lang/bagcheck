import type { Metadata } from "next";
import Link from "next/link";
import { WaveChart } from "@/components/idioms";
import type { WaveDay } from "@/components/idioms";
import { WrappedCard } from "@/components/cards/WrappedCard";
import { buildCards } from "@/lib/cards/kinds";
import { exampleLedger } from "@/lib/cards/exampleLedger";
import styles from "./landing.module.css";

export const metadata: Metadata = {
  title: "Bagcheck — transform how you trade",
  description:
    "Bagcheck reads your brokerage history — read-only, permanently — and scores the part you control. See what your habits are worth, in realised P&L.",
};

/**
 * The landing: the claim, the P&L element, and three real cards from the
 * example ledger — built by the same thirteen kinds the product mints, so
 * nothing here is a designer's mock. Motion is scroll reveals and the wave
 * drawing itself in; the static state is the finished design.
 */
export default function LandingPage() {
  const input = exampleLedger(2026);
  const cards = buildCards(input);
  const picks = ["archetype", "longestHold", "correlation"]
    .map((kind) => cards.find((c) => c.kind === kind))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const wave: WaveDay[] = input.dailyPnl.slice(-63).map((d) => ({
    date: d.date,
    amount: d.realised,
  }));
  const green = wave.filter((d) => d.amount > 0).length;
  const red = wave.filter((d) => d.amount < 0).length;

  return (
    <main className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.mark}>
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
            <circle
              cx="12"
              cy="12"
              r="9.4"
              fill="none"
              stroke="currentColor"
              strokeOpacity=".24"
              strokeWidth="2.6"
            />
            <path
              d="M12 2.6a9.4 9.4 0 0 1 8.1 14.1"
              fill="none"
              stroke="var(--moss)"
              strokeWidth="2.6"
              strokeLinecap="round"
            />
          </svg>
          <span className={styles.wordmark}>Bagcheck</span>
        </div>
        <Link href="/home" className={styles.navCta}>
          Sign in
        </Link>
      </header>

      <section className={styles.hero}>
        {/* The splash field: two slow orbs of the product's own light. */}
        <div className={styles.orb} data-orb="moss" aria-hidden="true" />
        <div className={styles.orb} data-orb="accent" aria-hidden="true" />
        {/* Real spaces between the spans: screen readers and copy-paste get
            the sentence, the animation gets the words. */}
        <h1 className={`disp ${styles.headline}`}>
          {"Transform how you trade.".split(" ").map((word, i) => (
            <span key={word}>
              {i > 0 ? " " : ""}
              <span
                className={styles.word}
                style={{ animationDelay: `${0.08 + i * 0.09}s` }}
              >
                {word}
              </span>
            </span>
          ))}
        </h1>
        <p className={styles.lede}>
          It starts with seeing what you actually do. Bagcheck reads your
          brokerage history — read-only, permanently — and scores the part you
          control: hold time, sizing, drawdown behaviour, consistency. Then it
          shows you what each habit actually returned, in realised dollars.
          First report in about ninety seconds.
        </p>
        <div className={styles.actions}>
          <Link href="/home" className={styles.cta}>
            Open Bagcheck
          </Link>
        </div>
        <p className={styles.trust}>
          Read-only via SnapTrade · no manual entry · never a price alert
        </p>
      </section>

      {/* The P&L element — green for profit, red for loss, drawn in. */}
      <section data-reveal className={styles.section}>
        <span className={styles.sectionEyebrow}>Sixty-three trading days</span>
        <h2 className={`disp ${styles.sectionTitle}`}>
          Bagcheck reads all of it and scores none of it.
        </h2>
        <div className={styles.waveFrame}>
          <div className={styles.waveHead}>
            <span className={styles.waveStat} data-tone="moss">
              {green} green
            </span>
            <span className={styles.waveStat} data-tone="loss">
              {red} red
            </span>
          </div>
          <WaveChart days={wave} />
          <p className={styles.sectionTail}>
            Daily realised P&amp;L, straight from an example brokerage ledger.
            The score is what you did on each of these days — never what the
            market did.
          </p>
        </div>
      </section>

      {/* The Wrapped demos — the same thirteen kinds the product mints. */}
      <section data-reveal className={styles.section}>
        <span className={styles.sectionEyebrow}>Wrapped, and proof you can post</span>
        <h2 className={`disp ${styles.sectionTitle}`}>
          Your year becomes cards worth posting.
        </h2>
        <div className={styles.deck}>
          {picks.map((card, i) => (
            <div key={card.kind} className={styles.deckCard} data-slot={i}>
              <WrappedCard
                eyebrow={card.eyebrow}
                kicker={card.kicker}
                headline={card.headline}
                lede={card.lede}
                body={card.body}
                slug={null}
                symbol={card.symbol}
                backdrop={`/cards/${card.kind}.jpg`}
                provenance="Bagcheck · example ledger"
                hue={card.hue}
                layout={card.layout}
                rarity={card.rarity}
              />
            </div>
          ))}
        </div>
        <p className={styles.sectionTail}>
          Built by the product's own card engine from an example ledger — the
          conviction card on the right needs months of tagged entries, which is
          why nobody can fake one.
        </p>
        <div className={styles.actions}>
          <Link href="/wrapped" className={styles.ctaGhost}>
            Play your year
          </Link>
        </div>
      </section>

      <section data-reveal className={styles.closing}>
        <h2 className={`disp ${styles.closingLine}`}>
          Your habits have a P&amp;L.
        </h2>
        <div className={styles.actions}>
          <Link href="/home" className={styles.cta}>
            Open Bagcheck
          </Link>
        </div>
      </section>

      <footer className={styles.foot}>
        <span>Bagcheck</span>
        <Link href="/legal/icons">Icon credits</Link>
      </footer>
    </main>
  );
}
