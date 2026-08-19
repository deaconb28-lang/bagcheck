import { STRONG } from "@/lib/archetypes";
import { Avatar } from "@/components/primitives";
import { CountUp, ScoreRing } from "@/components/idioms";
import { AllocationDonut } from "./Charts";
import type { Read } from "@/lib/portfolio/types";
import styles from "./hero.module.css";

/**
 * ── The hero: one object saying three true things ──
 *
 * The dashboard used to open on account value. That is the least interesting
 * true thing this product knows — a brokerage app tells you the same number,
 * faster, and it moves whether or not you did anything. What Steadyhands knows
 * that nothing else does is what the *conduct* looked like, and it has been
 * computing exactly that every night: a 0–100 score, four components, and one
 * of sixteen archetypes drawn as a character with a face.
 *
 * All of it rendered at 64px on the settings page.
 *
 * So the ring is the score, the character inside it is the archetype, and the
 * character's own colouring is already the components — the greyed parts are
 * the ones sitting under the bar. Three readings of one night, drawn once.
 * Nothing here is invented; every figure came off the nightly job.
 *
 * The whole block is absent when `read` is null. `archetypeFor` never returns
 * null — hand it nothing and it answers "The Improviser" — so a page that
 * guessed here would put a confident character with a name beside somebody's
 * ledger on the strength of no data at all.
 */

const LABEL: Record<string, string> = {
  adherence: "Adherence",
  consistency: "Consistency",
  patience: "Patience",
  exposure: "Exposure",
};

/** A component as a small dial. Under the bar it draws grey and says so. */
function Arc({ name, value }: { name: string; value: number }) {
  const size = 66;
  const stroke = 6;
  const r = size / 2 - stroke / 2 - 1;
  const c = 2 * Math.PI * r;
  const strong = value >= STRONG;

  return (
    <div className={styles.arc} data-strong={strong || undefined}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c.toFixed(1)}
          strokeDashoffset={(c * (1 - Math.max(0, Math.min(100, value)) / 100)).toFixed(1)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className={`num ${styles.arcValue}`}>{Math.round(value)}</span>
      <span className={styles.arcLabel}>{LABEL[name] ?? name}</span>
    </div>
  );
}

export function ScoreHero({
  read,
  year,
  allocation = [],
}: {
  read: Read;
  year: number;
  /** The book, for the small ring beside the read. Empty hides it. */
  allocation?: Array<{ key: string; label: string; value: number }>;
}) {
  const { archetype, components } = read;
  const above = archetype.strong.length;

  return (
    <section className={styles.hero} aria-labelledby="hero-score">
      <div className={styles.lockup}>
        {/*
          * The arc is gold and bare: the number is set at 140px an inch away,
          * and a ring printing it again is the same measurement twice.
          */}
        <div className={styles.ringWrap}>
          <ScoreRing score={read.score} size={228} bare>
            <Avatar archetype={archetype.key} size="var(--hero-avatar, 132px)" shape="circle" />
          </ScoreRing>
        </div>

        <div className={styles.words}>
          <p className={styles.eyebrow}>Tonight&rsquo;s read · {year}</p>
          <div className={styles.figureRow}>
            <span className={`poster ${styles.figure}`} id="hero-score">
              <CountUp value={read.score} kind="int" duration={1100} />
            </span>
            {read.delta != null && read.delta !== 0 ? (
              <span className={`num ${styles.delta}`} data-tone={read.delta > 0 ? "up" : "down"}>
                {read.delta > 0 ? "▲" : "▼"} {Math.abs(read.delta)}
                <span className={styles.deltaTail}> over a week</span>
              </span>
            ) : null}
          </div>
          <h1 className={`poster ${styles.name}`}>{archetype.name}</h1>
          <p className={styles.line}>{archetype.line}</p>

          {/*
            * Chips, and every one of them is absent rather than zeroed. A
            * streak below its own floor, a percentile under five scored days
            * and a personal best nobody has beaten all come back empty from
            * the view, so there is nothing to guard here.
            */}
          <div className={styles.chips}>
            {read.streaks.map((streak) => (
              <span key={streak.name} className={styles.chip} data-tone="ember">
                <span className={`num ${styles.chipNum}`}>{streak.days}</span> {streak.name}
              </span>
            ))}
            {read.best ? (
              <span className={styles.chip} data-tone="ember">
                Best <span className={`num ${styles.chipNum}`}>{read.best.score}</span> on{" "}
                {read.best.date}
              </span>
            ) : null}
            {/*
              * The percentile, phrased by where it actually lands.
              *
              * At the ends the percentage is the worst way to say it: a
              * reader whose newest score is their lowest so far met "Higher
              * than 0% of your own scored days", which is true, tells them
              * nothing they can act on, and reads as a broken figure. The
              * fact is the same in all three branches — this is the reader's
              * own distribution, never a cohort, and it says so.
              */}
            {read.percentile != null ? (
              <span className={styles.chip}>
                {read.percentile === 0 ? (
                  "Your lowest scored day so far"
                ) : read.percentile === 100 ? (
                  "Your best scored day so far"
                ) : (
                  <>
                    Higher than{" "}
                    <span className={`num ${styles.chipNum}`}>{read.percentile}%</span> of your
                    own scored days
                  </>
                )}
              </span>
            ) : null}
          </div>
        </div>

        {/*
          * The book, beside the read.
          *
          * The hero's right half was empty at every width above a laptop while
          * the one chart that answers "what is this made of" sat four blocks
          * further down. It is the ring alone here — `AllocationDonut` already
          * owns the honest arithmetic (the 3% floor, promoting a "Rest" of one
          * back out, butt caps so a small slice is not inflated by half a
          * stroke) and states its shares in an aria-label when it has no
          * legend to state them in.
          *
          * `AllocationDonut` returns null under two priced positions, so an
          * account this cannot describe simply leaves the space empty rather
          * than drawing a single arc that means nothing.
          */}
        {allocation.length ? (
          <div className={styles.book}>
            <AllocationDonut slices={allocation} size={150} compact />
          </div>
        ) : null}
      </div>

      <div className={styles.arcs}>
        {(["adherence", "consistency", "patience", "exposure"] as const).map((key) => (
          <Arc key={key} name={key} value={components[key]} />
        ))}
        <p className={styles.arcsNote}>
          {above === 4
            ? `All 4 above ${STRONG}.`
            : `${above} of 4 above ${STRONG}. The character fills in as the rest clear the bar.`}
        </p>
      </div>
    </section>
  );
}
