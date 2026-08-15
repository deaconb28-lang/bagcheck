import Link from "next/link";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { ShareButton } from "@/components/app/ShareButton";
import { TagPrompt } from "@/components/app/TagPrompt";
import { ScoreRing, ZeroBarChart } from "@/components/idioms";
import type { WaveDay } from "@/components/idioms";
import type { Tier } from "@/lib/tiers";
import type { UntaggedEntry } from "@/lib/tags";
import type { ScoreComponents } from "@/lib/score";
import type { CardSpec } from "@/lib/cards";
import type { WaveSummary } from "../derive";
import { signedMoney } from "../derive";
import { YearBlock } from "./YearBlock";
import screen from "../screen.module.css";
import styles from "./home.module.css";

export type HomeViewProps = {
  date: string;
  score: number;
  delta: number | null;
  components: ScoreComponents;
  insight: { sentence: string; tail?: string | null };
  wave: WaveDay[];
  waveSummary: WaveSummary;
  streak: number;
  scoredDays: number;
  queue: UntaggedEntry[];
  tagged: number;
  taggable: number;
  tier: Tier;
  syncedAt: string | null;
  /** The year's deck. Wrapped is the dashboard's hero, not a hidden route. */
  wrapped: {
    year: string;
    cards: CardSpec[];
    photos: Record<string, { url: string; color: string }>;
  } | null;
};

const COMPARISON: Record<string, string> = {
  adherence: "against your own baseline",
  consistency: "sizing and cadence",
  patience: "what you do in a drawdown",
  exposure: "inside your band",
};

function greeting(): string {
  const h = new Date().getUTCHours();
  return h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
}

/**
 * Home: your year, and how it's going.
 *
 * Four blocks. It was eleven, stacked at 34px over about 3,600px — four
 * viewport heights — with the realised P&L printed three times, the score
 * components rendered twice, the streak three times, and three filled tiles
 * nested inside a filled panel. Nothing there was wrong on its own; the screen
 * was a list of every readout the product could produce, in the order they
 * were built.
 *
 * So it answers one question per block, in the landing's grammar: an eyebrow,
 * a real heading, one figure, one line of support, and 96px of nothing before
 * the next. The analysis moved to `/you`, which is where a reader goes to be
 * told about themselves rather than told how today went.
 *
 * The money leads. A dashboard's first answer is how the account is doing,
 * and a reader who opens this screen is asking that before they are asking
 * anything else — the deck is the artefact, and an artefact is what you go to
 * once you know where you stand.
 */
export function HomeView(props: HomeViewProps) {
  const {
    score,
    delta,
    components,
    insight,
    wave,
    waveSummary: summary,
    streak,
    scoredDays,
    queue,
    tagged,
    taggable,
    tier,
    syncedAt,
    wrapped,
    date,
  } = props;

  return (
    <>
      <ScreenHeader
        title={greeting()}
        meta={`${date} · ${scoredDays} scored days · day ${streak} inside your rules`}
        score={null}
        syncedAt={syncedAt}
        tier={tier}
      />

      <div className={screen.body}>
        <div className={`${screen.grid} ${styles.wide}`}>
          {/* ── 1 · The money ── */}
          {wave.length > 1 ? (
            <section id="money" data-reveal className={styles.block}>
              <span className={styles.eyebrow}>Realised P&amp;L</span>
              <div className={styles.headRow}>
                <h2
                  className={`num ${styles.h2}`}
                  data-tone={summary.total >= 0 ? "moss" : "loss"}
                >
                  {signedMoney(summary.total)}
                </h2>
                <ShareButton type="monthlyPnl" label="this chart" size={44} />
              </div>
              <p className={styles.lede}>
                Across {wave.length} sessions — {summary.green} green, {summary.red}{" "}
                red. Best {signedMoney(summary.best)}, worst {signedMoney(summary.worst)}.
              </p>

              <div className={styles.chart}>
                <ZeroBarChart days={wave} />
              </div>
            </section>
          ) : null}

          {/* ── 2 · The year ── */}
          {wrapped ? (
            <YearBlock year={wrapped.year} cards={wrapped.cards} photos={wrapped.photos} />
          ) : null}

          {/* ── 3 · The read ── */}
          <section id="read" data-reveal className={styles.block} style={{ animationDelay: "0.04s" }}>
            <span className={styles.eyebrow}>Health today</span>
            <div className={styles.headRow} data-dial>
              {/*
                * The dial, drawn bare. The figure is set at 62px an inch
                * away, so a ring printing it again would be the same
                * measurement twice — the arc alone says how far along the
                * number is. It is the one place in the app that gets a halo,
                * because it is the one number that is live.
                */}
              <span className={styles.dial}>
                <ScoreRing score={score} size={92} bare />
              </span>
              <h2 className={`num ${styles.h2}`}>{score}</h2>
              {delta != null && delta !== 0 ? (
                <span className={styles.delta}>
                  {delta > 0 ? "+" : "−"}
                  {Math.abs(delta)} this week
                </span>
              ) : null}
            </div>
            <p className={styles.lede}>{insight.sentence}</p>

            {/*
              * The four readings as figures on one hairline-ruled row. They
              * were meters here and meters again in the archetype panel below
              * — eight saturated bars on one screen, when the figure beside
              * each is what carries the reading.
              */}
            <div className={styles.figures}>
              {(Object.entries(components) as Array<[string, number]>).map(([name, value]) => (
                <div key={name} className={styles.figure}>
                  <span className={styles.figLabel}>{name}</span>
                  <span className={`num ${styles.figValue}`}>{value}</span>
                  <span className={styles.figTail}>{COMPARISON[name] ?? ""}</span>
                </div>
              ))}
            </div>

            <div className={styles.actions}>
              <span className={styles.written}>Written by Bagcheck</span>
              <ShareButton type="health" label="your score" size={44} />
            </div>
          </section>

          {/* ── 4 · The loop ── */}
          <section data-reveal className={styles.block} style={{ animationDelay: "0.06s" }}>
            <TagPrompt queue={queue} tagged={tagged} total={Math.max(taggable, tagged)} />
          </section>

          {/* One quiet line out. */}
          <Link href="/you" className={styles.out}>
            Everything your history says about you
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h13" />
              <path d="M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </>
  );
}
