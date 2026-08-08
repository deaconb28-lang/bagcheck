import Link from "next/link";
import { Avatar } from "@/components/primitives";
import { strongLine } from "@/lib/archetypes";
import type { Archetype } from "@/lib/archetypes";
import { HeatGrid, ScoreRing, WaveChart } from "@/components/idioms";
import type { HeatDay, WaveDay } from "@/components/idioms";
import { Locked } from "@/components/app/Locked";
import { PulseSurvey } from "@/components/app/PulseSurvey";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { ShareButton } from "@/components/app/ShareButton";
import { TagPrompt } from "@/components/app/TagPrompt";
import { readiness } from "@/lib/tiers";
import type { Tier } from "@/lib/tiers";
import { CORRELATION_FLOOR } from "@/lib/tags";
import type { UntaggedEntry } from "@/lib/tags";
import type { ScoreComponents } from "@/lib/score";
import type { WaveSummary } from "../derive";
import { signedMoney } from "../derive";
import screen from "../screen.module.css";
import styles from "./home.module.css";

export type HomeViewProps = {
  date: string;
  score: number;
  delta: number | null;
  components: ScoreComponents;
  insight: { sentence: string; tail?: string | null };
  archetype: Archetype;
  /** Whether generated avatar art exists on this deployment. */
  avatarArt?: boolean;
  wave: WaveDay[];
  waveSummary: WaveSummary;
  heat: HeatDay[];
  streak: number;
  longest: number;
  scoredDays: number;
  queue: UntaggedEntry[];
  tagged: number;
  taggable: number;
  tier: Tier;
  syncedAt: string | null;
  accountCount: number;
  transactionCount: number;
  pulse: { question: string; options: readonly string[] } | null;
};

/** Exposure is a comparison, so it takes signal. The rest are discipline. */
const COMPONENT_TONE: Record<string, "moss" | "signal"> = {
  adherence: "moss",
  consistency: "moss",
  patience: "moss",
  exposure: "signal",
};

const COMPARISON: Record<string, string> = {
  adherence: "against your own baseline",
  consistency: "sizing and cadence, week over week",
  patience: "what you do in a drawdown",
  exposure: "inside your band",
};

function greeting(): string {
  const h = new Date().getUTCHours();
  return h < 12 ? "Morning" : h < 18 ? "Afternoon" : "Evening";
}

/**
 * Home. Score first, tag prompt second, then the record.
 *
 * The tag prompt sits that high because it is the only input a brokerage
 * cannot supply and everything in Patterns is downstream of it — burying it
 * in a settings screen is how the correlation layer never gets any data.
 */
export function HomeView(props: HomeViewProps) {
  const {
    score,
    delta,
    components,
    insight,
    archetype,
    avatarArt = false,
    wave,
    waveSummary: summary,
    heat,
    streak,
    longest,
    scoredDays,
    queue,
    tagged,
    taggable,
    tier,
    syncedAt,
    accountCount,
    transactionCount,
    pulse,
    date,
  } = props;

  return (
    <>
      <ScreenHeader
        title={`${greeting()}`}
        meta={`${date} · ${scoredDays} scored days · day ${streak} inside your rules`}
        score={score}
        delta={delta}
        syncedAt={syncedAt}
        tier={tier}
      />

      <div className={screen.body}>
        <div className={screen.grid}>
          <div className={screen.column}>
            {/* 1 — the score and its decomposition. Nothing above the fold is prose. */}
            <section data-reveal className={`${screen.panel} ${screen.hero} ${styles.heroPanel}`}>
              <ScoreRing score={score} />

              <div className={styles.heroText}>
                <div className={styles.heroChips}>
                  <span className={screen.chip} data-tone="accent">
                    Written by Bagcheck
                  </span>
                  {delta != null && delta !== 0 ? (
                    <span className={screen.chip}>
                      {delta > 0 ? "+" : "−"}
                      {Math.abs(delta)} this week
                    </span>
                  ) : null}
                  <div className={screen.spacer} />
                  <ShareButton type="score" label="your score" />
                </div>

                <p className={`disp ${styles.sentence}`}>{insight.sentence}</p>

                <div className={styles.componentGrid}>
                  {(Object.entries(components) as Array<[string, number]>).map(
                    ([name, value], i) => (
                      <div key={name} className={screen.stat}>
                        <span className={screen.eyebrow}>{name}</span>
                        <div className={`num ${screen.statValue}`}>{value}</div>
                        <div className={screen.statMeter}>
                          <i
                            className={screen.statFill}
                            data-tone={COMPONENT_TONE[name] ?? "moss"}
                            style={{ width: `${value}%`, animationDelay: `${i * 80}ms` }}
                          />
                        </div>
                        <span className={screen.statTail}>{COMPARISON[name] ?? ""}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </section>

            {/* 2 — the loop the engine runs on. */}
            <section data-reveal className={screen.panel} style={{ animationDelay: "0.03s" }}>
              <TagPrompt queue={queue} tagged={tagged} total={Math.max(taggable, tagged)} />
            </section>

            {/* 3 — identity, in the column rather than the rail. */}
            <section
              data-reveal
              className={`${screen.panel} ${styles.archetype}`}
              style={{ animationDelay: "0.04s" }}
            >
              <div className={styles.archText}>
                <Avatar archetype={archetype.key} size={52} art={avatarArt} />
                <div className={styles.archTextBody}>
                  <span className={screen.eyebrow}>Your archetype</span>
                  <div className={`disp ${styles.archName}`}>{archetype.name}</div>
                  <p className={screen.tail}>{archetype.line}</p>
                  <span className={styles.archStrong}>{strongLine(archetype)}</span>
                </div>
              </div>
              <div className={styles.archBars}>
                {(Object.entries(components) as Array<[string, number]>).map(([name, value], i) => (
                  <div key={name} className={styles.archRow}>
                    <span className={styles.archLabel}>{name}</span>
                    <div className={screen.statMeter}>
                      <i
                        className={screen.statFill}
                        data-tone={COMPONENT_TONE[name] ?? "moss"}
                        style={{ width: `${value}%`, animationDelay: `${i * 70}ms` }}
                      />
                    </div>
                    <span className={styles.archValue}>{value}</span>
                  </div>
                ))}
              </div>
              <Link href="/dna" className={styles.openDna}>
                Open DNA
              </Link>
              <ShareButton type="hold" label="your archetype" size={44} />
            </section>

            {/* 4 — P&L, mirrored. */}
            {wave.length > 1 ? (
              <section data-reveal className={screen.panel} style={{ animationDelay: "0.05s" }}>
                <div className={screen.head}>
                  <div className={screen.headText}>
                    <span className={screen.eyebrow}>
                      Realised P&amp;L · {wave.length} sessions
                    </span>
                    <div className={styles.pnlRow}>
                      <span className={`num ${styles.pnlFigure}`}>
                        {signedMoney(summary.total)}
                      </span>
                      <span className={styles.pnlNote}>
                        {summary.green} green · {summary.red} red
                      </span>
                    </div>
                  </div>
                  <ShareButton type="quarter" label="this chart" size={34} />
                </div>

                <WaveChart days={wave} />

                <div className={`${screen.divider} ${styles.waveStats}`}>
                  {[
                    ["Green days", String(summary.green)],
                    ["Red days", String(summary.red)],
                    ["Best session", signedMoney(summary.best)],
                    ["Worst session", signedMoney(summary.worst)],
                  ].map(([label, value]) => (
                    <div key={label} className={styles.waveStat}>
                      <span className={screen.eyebrow}>{label}</span>
                      <span className={`num ${styles.waveStatValue}`}>{value}</span>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* 5 — consistency, as a grid. */}
            <section data-reveal className={screen.panel} style={{ animationDelay: "0.06s" }}>
              <div className={screen.head}>
                <div className={screen.headText}>
                  <span className={screen.eyebrow}>Days inside your rules</span>
                  <div className={`disp ${screen.h2}`}>
                    {heat.filter((d) => d.level >= 2).length} of {scoredDays} scored sessions
                  </div>
                </div>
                <ShareButton type="streak" label="your streak" />
              </div>

              <HeatGrid days={heat} />

              <div className={screen.chips}>
                <span className={screen.chip} data-tone="moss">
                  <span className={screen.chipNum}>{streak}</span> day streak
                </span>
                <span className={screen.chip}>
                  Longest: <span className={screen.chipNum}>{longest}</span>
                </span>
                <Link href="/patterns" className={screen.chip}>
                  Open Patterns
                </Link>
                <Link href="/ledger" className={screen.chip}>
                  Open Ledger
                </Link>
              </div>
            </section>

            {/* 6 — the lock, in the slot its unlocked twin would take. */}
            <section data-reveal className={screen.panel} style={{ animationDelay: "0.08s" }}>
              <Locked
                capability="sessionRecapCard"
                eyebrow="Session recap · at the close"
                readiness={readiness(tagged, CORRELATION_FLOOR)}
              >
                <div className={styles.recap}>
                  {[
                    ["61%", "Win rate today"],
                    ["4", "Trades"],
                    ["+$1,240", "Session P&L"],
                  ].map(([v, l]) => (
                    <div key={l} className={screen.sunken}>
                      <div className={`num ${styles.recapValue}`}>{v}</div>
                      <div className={screen.tail}>{l}</div>
                    </div>
                  ))}
                </div>
              </Locked>
            </section>
          </div>

          <aside className={screen.rail}>
            {pulse ? (
              <div className={screen.panel}>
                <PulseSurvey date={date} question={pulse.question} options={pulse.options} />
              </div>
            ) : null}

            <div className={screen.panel}>
              <span className={screen.eyebrow}>Ledger</span>
              <p className={screen.tail}>
                {transactionCount.toLocaleString("en-US")} trades and transfers across{" "}
                {accountCount} {accountCount === 1 ? "account" : "accounts"}, exactly as
                the brokerage reported them.
              </p>
              <Link href="/ledger" className={styles.railLink}>
                Open the ledger
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
