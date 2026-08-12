import Link from "next/link";
import styles from "./coming.module.css";

/**
 * What Wrapped is the first chapter of.
 *
 * Wrapped is the retrospective — one year, thirteen artefacts, done. The
 * instrument is the daily practice, and it is being built. This section is
 * where a reader who just got their cards finds out that, and it is deliberately
 * the *last* thing on the screen: the cards are what they came for and they get
 * them first.
 *
 * **Every tile names a real thing on the roadmap and states honestly that it is
 * not built.** No dates, no countdown, no "coming in Q3" — a shipped date is a
 * promise this file cannot keep. The status words are a closed set of three and
 * they describe build state, not scarcity.
 *
 * The readouts behind the names are drawn, blurred and inert. They are the
 * shape of the answer rather than an answer: a ring, a band, a set of bars. A
 * locked tile carrying a real-looking number would be inventing a fact about
 * someone's own behaviour, which is the one thing this product does not do.
 */

type Status = "In build" | "Designed" | "Next";

interface Feature {
  name: string;
  line: string;
  status: Status;
  /** Which drawn readout ghosts behind the name. */
  shape: "ring" | "bars" | "line" | "band" | "grid" | "dial";
}

interface Band {
  eyebrow: string;
  title: string;
  lede: string;
  features: Feature[];
}

const BANDS: Band[] = [
  {
    eyebrow: "Daily",
    title: "The score",
    lede: "One number a night, measured against your own baseline rather than a model investor.",
    features: [
      {
        name: "Health score",
        line: "0–100, recomputed each night off the day's fills. A disciplined day trader and a disciplined index buyer can both read 95.",
        status: "In build",
        shape: "ring",
      },
      {
        name: "The four components",
        line: "Adherence, consistency, patience and exposure, each scored on its own and each able to explain the number above it.",
        status: "In build",
        shape: "bars",
      },
      {
        name: "Where today sits",
        line: "Today's score against the distribution of your own scored days — a percentile of you, never of other people.",
        status: "Designed",
        shape: "band",
      },
      {
        name: "The daily read",
        line: "One written paragraph about what the ledger did today. One a day, never a price alert.",
        status: "In build",
        shape: "line",
      },
    ],
  },
  {
    eyebrow: "Identity",
    title: "Who the year says you are",
    lede: "The readings that go beside your name, all of them derived and none of them chosen.",
    features: [
      {
        name: "Investor Age",
        line: "How old your behaviour reads, bounded 18 to 72. Deterministic, and exposure is deliberately absent from it.",
        status: "In build",
        shape: "dial",
      },
      {
        name: "Sixteen archetypes",
        line: "Each score component is above the fixed bar or it is not, so every profile lands in exactly one corner.",
        status: "Designed",
        shape: "grid",
      },
      {
        name: "Streaks",
        line: "Consecutive sessions inside your own rules, counted the way a training streak is.",
        status: "Designed",
        shape: "bars",
      },
      {
        name: "Personal records",
        line: "Longest hold, deepest drawdown held through, cleanest run — your own bests, not a leaderboard.",
        status: "Next",
        shape: "line",
      },
    ],
  },
  {
    eyebrow: "Patterns",
    title: "What your P&L hides",
    lede: "Correlations the engine only reports once it has enough of your own history to mean anything.",
    features: [
      {
        name: "Entries by hour",
        line: "Whether your average return changes with the time of day you open a position.",
        status: "In build",
        shape: "bars",
      },
      {
        name: "Session size",
        line: "What happens to your win rate on the days you take six trades instead of two.",
        status: "In build",
        shape: "band",
      },
      {
        name: "Exit speed",
        line: "How much faster you sell the ones that are up than the ones that are down.",
        status: "Designed",
        shape: "line",
      },
      {
        name: "Conviction decay",
        line: "What your high-conviction entries actually returned against your low-conviction ones.",
        status: "Designed",
        shape: "dial",
      },
      {
        name: "Event segments",
        line: "How you held through a specific drawdown, measured against the window rather than the year.",
        status: "Next",
        shape: "grid",
      },
    ],
  },
  {
    eyebrow: "Practice",
    title: "The loop that makes it work",
    lede: "Two taps at entry is the only input a brokerage cannot supply, and every correlation above is downstream of it.",
    features: [
      {
        name: "Why and conviction",
        line: "Two taps when you open a position. No text field — a reason that cannot be grouped cannot become a finding.",
        status: "In build",
        shape: "grid",
      },
      {
        name: "The ledger",
        line: "Every round trip with its hold time and realised P&L, reconciled against the broker's own numbers.",
        status: "In build",
        shape: "line",
      },
      {
        name: "Weekly recap",
        line: "One message a week about what changed. Opt-in, and off by default.",
        status: "Next",
        shape: "band",
      },
      {
        name: "Quarterly Wrapped",
        line: "The cards you have just read, minted again every quarter instead of once a year.",
        status: "Next",
        shape: "ring",
      },
    ],
  },
];

export function ComingSoon() {
  const total = BANDS.reduce((n, b) => n + b.features.length, 0);

  return (
    <section className={styles.coming} aria-labelledby="coming-title">
      <header className={styles.head}>
        <span className={styles.eyebrow}>Under construction</span>
        <h2 className={styles.title} id="coming-title">
          Wrapped is the year. The score is the practice.
        </h2>
        <p className={styles.lede}>
          Your cards are a retrospective — one year, read once. What is being
          built above them is the daily instrument: a number each night, the
          four things that move it, and the patterns your own history is hiding.
          {" "}
          {total} of them are in the workshop. None is finished, and none of
          these tiles is showing you a real figure.
        </p>
        <Link className={styles.cta} href="/#waitlist">
          Join the waitlist for the score
          <Arrow />
        </Link>
      </header>

      {BANDS.map((band) => (
        <div key={band.title} className={styles.band} data-reveal>
          <div className={styles.bandHead}>
            <span className={styles.bandEyebrow}>{band.eyebrow}</span>
            <h3 className={styles.bandTitle}>{band.title}</h3>
            <p className={styles.bandLede}>{band.lede}</p>
          </div>

          <ul className={styles.tiles}>
            {band.features.map((f) => (
              <li key={f.name} className={styles.tile}>
                {/* Inert, blurred, and shaped like the answer rather than
                    being one. Nothing here is read from anyone's ledger. */}
                <span className={styles.ghost} aria-hidden="true">
                  <Readout shape={f.shape} />
                </span>
                <span className={styles.lock} aria-hidden="true">
                  <Lock />
                </span>
                <h4 className={styles.tileName}>{f.name}</h4>
                <p className={styles.tileLine}>{f.line}</p>
                <span className={styles.status} data-status={f.status}>
                  {f.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/** Six inert figures. They carry no data and take no props but their shape. */
function Readout({ shape }: { shape: Feature["shape"] }) {
  const stroke = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 7,
    strokeLinecap: "round" as const,
  };
  switch (shape) {
    case "ring":
      return (
        <svg viewBox="0 0 120 60" aria-hidden="true">
          <circle {...stroke} cx="60" cy="34" r="22" strokeDasharray="104 40" />
        </svg>
      );
    case "bars":
      return (
        <svg viewBox="0 0 120 60" aria-hidden="true">
          {[14, 30, 22, 42, 34, 50].map((h, i) => (
            <rect key={i} x={12 + i * 18} y={54 - h} width="11" height={h} rx="5" fill="currentColor" />
          ))}
        </svg>
      );
    case "line":
      return (
        <svg viewBox="0 0 120 60" aria-hidden="true">
          <path {...stroke} d="M8 46q18-6 28-18t26 2 26-20 24 8" />
        </svg>
      );
    case "band":
      return (
        <svg viewBox="0 0 120 60" aria-hidden="true">
          <rect x="8" y="20" width="104" height="20" rx="10" fill="currentColor" opacity="0.4" />
          <rect x="70" y="14" width="10" height="32" rx="5" fill="currentColor" />
        </svg>
      );
    case "grid":
      return (
        <svg viewBox="0 0 120 60" aria-hidden="true">
          {[0, 1, 2, 3].map((c) =>
            [0, 1].map((r) => (
              <rect
                key={`${c}-${r}`}
                x={16 + c * 24}
                y={12 + r * 24}
                width="17"
                height="17"
                rx="6"
                fill="currentColor"
                opacity={(c + r) % 2 ? 0.45 : 1}
              />
            )),
          )}
        </svg>
      );
    case "dial":
      return (
        <svg viewBox="0 0 120 60" aria-hidden="true">
          <path {...stroke} d="M20 48a30 30 0 0 1 80 0" />
          <path {...stroke} strokeWidth="6" d="M60 48l20-24" />
        </svg>
      );
  }
}

function Lock() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="10.5" width="16" height="10.5" rx="3" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
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
