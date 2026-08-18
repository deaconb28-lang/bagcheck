import { STRONG } from "@/lib/archetypes";
import { Avatar } from "@/components/primitives";
import { ScoreRing } from "@/components/idioms";
import type { Read } from "@/lib/portfolio/types";
import styles from "./hero.module.css";

/**
 * ── The hero: one object saying three true things ──
 *
 * The dashboard used to open on account value. That is the least interesting
 * true thing this product knows — a brokerage app tells you the same number,
 * faster, and it moves whether or not you did anything. What Bagcheck knows
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

export function ScoreHero({ read, year }: { read: Read; year: number }) {
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
              {read.score}
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
            {read.percentile != null ? (
              <span className={styles.chip}>
                Higher than <span className={`num ${styles.chipNum}`}>{read.percentile}%</span> of
                your own scored days
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className={styles.arcs}>
        {(["adherence", "consistency", "patience", "exposure"] as const).map((key) => (
          <Arc key={key} name={key} value={components[key]} />
        ))}
        <p className={styles.arcsNote}>
          {above === 4
            ? `All four are above ${STRONG}.`
            : above === 0
              ? `None are above ${STRONG} yet. The character fills in as they clear it.`
              : `${above === 1 ? "One" : above === 2 ? "Two" : "Three"} of the four are above ${STRONG}. The character fills in as the rest clear it.`}
        </p>
      </div>
    </section>
  );
}
