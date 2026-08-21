import Link from "next/link";
import { Teaser } from "@/components/cards/Teaser";
import type { TeaserKind } from "@/components/cards/Teaser";
import styles from "./coming.module.css";

/**
 * What Wrapped is the first chapter of.
 *
 * Wrapped is the retrospective — one year, thirteen artefacts, done. The
 * instrument is the daily practice, and it is being built. This section is
 * where a reader who just got their cards finds that out, and it is
 * deliberately below the deck: the cards are what they came for.
 *
 * **It is a list, not seventeen cards.** The build before this gave every
 * roadmap item the full card treatment — a bordered tile, a blurred drawn
 * readout, a lock glyph, a name, a sentence and a status — and then repeated
 * that seventeen times down four bands. Seventeen instances of one component
 * is a wall: nothing is scannable because nothing is distinguishable, and the
 * ghost readouts made a page about *not having data yet* look like a page
 * dense with data. A roadmap is a list of names and states, so this is a list
 * of names and states: four groups, one row each, hairline between them.
 *
 * Every row names a real thing and states honestly that it is not built. No
 * dates, no countdown, no "coming in Q3" — a shipped date is a promise this
 * file cannot keep. The status words are a closed set of three and they
 * describe build state, never scarcity.
 */

type Status = "In build" | "Designed" | "Next";

interface Feature {
  name: string;
  line: string;
  status: Status;
  /**
   * The drawing of the readout. Shapes only — a roadmap tile showing a
   * plausible figure would be inventing a fact about someone's own behaviour,
   * which is the one thing this product does not do.
   */
  teaser: TeaserKind;
}

interface Band {
  eyebrow: string;
  title: string;
  features: Feature[];
}

const BANDS: Band[] = [
  {
    eyebrow: "Daily",
    title: "The score",
    features: [
      {
        name: "Health score",
        line: "0–100, recomputed each night off the day's fills. A disciplined day trader and a disciplined index buyer can both read 95.",
        status: "In build",
        teaser: "ring",
      },
      {
        name: "The four components",
        line: "Adherence, consistency, patience and exposure, each scored on its own and each able to explain the number above it.",
        status: "In build",
        teaser: "components",
      },
      {
        name: "Where today sits",
        line: "Today's score against the distribution of your own scored days — a percentile of you, never of other people.",
        status: "Designed",
        teaser: "percentile",
      },
      {
        name: "The daily read",
        line: "One written paragraph about what the ledger did today. One a day, never a price alert.",
        status: "In build",
        teaser: "paragraph",
      },
    ],
  },
  {
    eyebrow: "Identity",
    title: "Who the year says you are",
    features: [
      {
        name: "Investor Age",
        line: "How old your behaviour reads, bounded 18 to 72. Deterministic, and exposure is deliberately absent from it.",
        status: "In build",
        teaser: "age",
      },
      {
        name: "Sixteen archetypes",
        line: "Each score component is above the fixed bar or it is not, so every profile lands in exactly one corner.",
        status: "Designed",
        teaser: "archetypes",
      },
      {
        name: "Streaks",
        line: "Consecutive sessions inside your own rules, counted the way a training streak is.",
        status: "Designed",
        teaser: "streak",
      },
      {
        name: "Personal records",
        line: "Longest hold, deepest drawdown held through, cleanest run — your own bests, not a leaderboard.",
        status: "Next",
        teaser: "records",
      },
    ],
  },
  {
    eyebrow: "Patterns",
    title: "What your P&L hides",
    features: [
      {
        name: "Entries by hour",
        line: "Whether your average return changes with the time of day you open a position.",
        status: "In build",
        teaser: "hours",
      },
      {
        name: "Session size",
        line: "What happens to your win rate on the days you take six trades instead of two.",
        status: "In build",
        teaser: "sessionSize",
      },
      {
        name: "Exit speed",
        line: "How much faster you sell the ones that are up than the ones that are down.",
        status: "Designed",
        teaser: "exitSpeed",
      },
      {
        name: "Conviction decay",
        line: "What your high-conviction entries actually returned against your low-conviction ones.",
        status: "Designed",
        teaser: "conviction",
      },
      {
        name: "Event segments",
        line: "How you held through a specific drawdown, measured against the window rather than the year.",
        status: "Next",
        teaser: "eventWindow",
      },
    ],
  },
  {
    eyebrow: "Practice",
    title: "The loop that makes it work",
    features: [
      {
        name: "Why and conviction",
        line: "Two taps when you open a position. No text field — a reason that cannot be grouped cannot become a finding.",
        status: "In build",
        teaser: "twoTap",
      },
      {
        name: "The ledger",
        line: "Every round trip with its hold time and realised P&L, reconciled against the broker's own numbers.",
        status: "In build",
        teaser: "ledger",
      },
      {
        name: "Weekly recap",
        line: "One message a week about what changed. Opt-in, and off by default.",
        status: "Next",
        teaser: "digest",
      },
      {
        name: "Quarterly Wrapped",
        line: "The cards you have just read, minted again every quarter instead of once a year.",
        status: "Next",
        teaser: "cardFan",
      },
    ],
  },
];

export function ComingSoon() {
  const total = BANDS.reduce((n, b) => n + b.features.length, 0);
  const building = BANDS.reduce(
    (n, b) => n + b.features.filter((f) => f.status === "In build").length,
    0,
  );

  return (
    <section className={styles.coming} aria-labelledby="coming-title">
      <header className={styles.head}>
        <div className={styles.headText}>
          <span className={styles.eyebrow}>Under construction</span>
          <h2 className={styles.title} id="coming-title">
            Wrapped is the year.
            <br />
            The score is the practice.
          </h2>
          <p className={styles.lede}>
            Your cards are a retrospective — one year, read once. The daily
            instrument underneath them is a number each night, the four things
            that move it, and the patterns your own history is hiding.{" "}
            {building} of {total} are being built right now. None is finished.
          </p>
          <Link className={styles.cta} href="/start">
            Start with your Wrapped
            <Arrow />
          </Link>
        </div>

        <dl className={styles.tally}>
          {(["In build", "Designed", "Next"] as Status[]).map((status) => (
            <div key={status} className={styles.tallyRow}>
              <dt className={styles.tallyLabel} data-status={status}>
                {status}
              </dt>
              <dd className={styles.tallyValue}>
                {BANDS.reduce(
                  (n, b) => n + b.features.filter((f) => f.status === status).length,
                  0,
                )}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <div className={styles.bands}>
        {BANDS.map((band) => (
          <section key={band.title} className={styles.band} data-band={band.eyebrow} data-reveal>
            <h3 className={styles.bandTitle}>
              <span className={styles.bandEyebrow}>{band.eyebrow}</span>
              {band.title}
            </h3>

            <ul className={styles.rows}>
              {band.features.map((f) => (
                <li key={f.name} className={styles.row}>
                  {/* What it will look like, drawn. Shapes, never figures. */}
                  <Teaser kind={f.teaser} className={styles.thumb} />
                  <span className={styles.rowName}>{f.name}</span>
                  <span className={styles.status} data-status={f.status}>
                    {f.status}
                  </span>
                  <p className={styles.rowLine}>{f.line}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </section>
  );
}

function Arrow() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h13" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}
