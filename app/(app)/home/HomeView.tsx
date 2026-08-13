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
import { can, readiness } from "@/lib/tiers";
import type { Tier } from "@/lib/tiers";
import { CORRELATION_FLOOR } from "@/lib/tags";
import type { UntaggedEntry } from "@/lib/tags";
import type { ScoreComponents } from "@/lib/score";
import type { Finding } from "@/lib/engine";
import type { SessionRecap, WaveSummary } from "../derive";
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
  wave: WaveDay[];
  waveSummary: WaveSummary;
  /** Ledger findings with dollar impacts, straight off the derived doc. */
  findings: Finding[];
  /** The latest realised session, for the Trader recap. */
  recap: SessionRecap | null;
  heat: HeatDay[];
  streak: number;
  longest: number;
  scoredDays: number;
  queue: UntaggedEntry[];
  tagged: number;
  taggable: number;
  tier: Tier;
  syncedAt: string | null;
  age?: number | null;
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

/** The header pill's numbers: how many patterns speak, and the worst one. */
function leakSummary(findings: Finding[]): { count: number; worst: number | null } | null {
  if (!findings.length) return null;
  const impacts = findings.map((f) => f.impact).filter((n): n is number => n != null && n < 0);
  return { count: findings.length, worst: impacts.length ? Math.min(...impacts) : null };
}

/** Leaks first (most negative), then the rest in engine order. */
function moneyOrder(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) => (a.impact ?? Number.POSITIVE_INFINITY) - (b.impact ?? Number.POSITIVE_INFINITY),
  );
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
    wave,
    waveSummary: summary,
    findings,
    recap,
    heat,
    streak,
    longest,
    scoredDays,
    queue,
    tagged,
    taggable,
    tier,
    syncedAt,
    age = null,
    accountCount,
    transactionCount,
    pulse,
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
          <div className={styles.dash}>
            {/*
              * 1 — the score, as a lockup rather than a centred stack.
              *
              * The ring beside the figure is the same grammar the Wrapped
              * screen opens with and the landing sells: an object on the left,
              * an enormous number and its sentence on the right. Centring all
              * of it stacked the screen a thousand pixels deep for one
              * measurement and left the reader scrolling to reach anything
              * they could act on.
              */}
            <section data-reveal className={`${screen.panel} ${screen.hero} ${styles.hero} ${styles.span}`}>
              <div className={styles.heroRing}>
                {/* A dial, not a second readout — the figure is beside it. */}
                <ScoreRing score={score} size={208} bare />
              </div>

              <div className={styles.heroLockup}>
                <span className={styles.heroEyebrow}>Health today</span>
                <div className={styles.heroFigure}>
                  <span className={styles.heroScore}>{score}</span>
                  {delta != null && delta !== 0 ? (
                    <span className={styles.heroDelta} data-dir={delta > 0 ? "up" : "down"}>
                      {delta > 0 ? "+" : "−"}
                      {Math.abs(delta)} this week
                    </span>
                  ) : null}
                </div>

                <p className={`disp ${styles.sentence}`}>{insight.sentence}</p>

                <div className={styles.heroActions}>
                  <span className={screen.chip} data-tone="accent">
                    Written by Bagcheck
                  </span>
                  <ShareButton type="health" label="your score" />
                </div>
              </div>

              {/* The four things that move the number, across the full width. */}
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
            </section>

            {/*
              * The readings that used to crowd the header. They are facts about
              * the reader rather than chrome, so they sit on the page — and the
              * header goes back to being one line and an account cluster.
              */}
            <div className={`${styles.readings} ${styles.span}`}>
              {[
                { href: "/patterns", value: String(streak), label: "day streak", tone: "moss" },
                age != null
                  ? { href: "/dna", value: String(age), label: "investor age", tone: "accent" }
                  : null,
                leakSummary(findings)
                  ? {
                      href: "/patterns",
                      value: String(leakSummary(findings)!.count),
                      label:
                        leakSummary(findings)!.worst != null
                          ? `patterns · ${signedMoney(leakSummary(findings)!.worst!)}`
                          : "patterns on file",
                      tone: "signal",
                    }
                  : null,
                { href: "/ledger", value: longest > 0 ? String(longest) : "—", label: "longest run", tone: "ember" },
              ]
                .filter((r): r is { href: string; value: string; label: string; tone: string } => r !== null)
                .map((r) => (
                  <Link key={r.label} href={r.href} className={styles.reading} data-tone={r.tone}>
                    <span className={`num ${styles.readingValue}`}>{r.value}</span>
                    <span className={styles.readingLabel}>{r.label}</span>
                  </Link>
                ))}
            </div>

            {/*
              * 2 — where the money went. The engine's findings denominated in
              * realised dollars, leaks first: the panel that says why any of
              * this is worth reading. Absent until something clears a floor —
              * a money panel with invented numbers would poison everything
              * around it.
              */}
            {findings.length ? (
              <section data-reveal className={screen.panel} style={{ animationDelay: "0.02s" }}>
                <div className={screen.head}>
                  <div className={screen.headText}>
                    <span className={screen.eyebrow}>Where the money went</span>
                    <div className={`disp ${screen.h2}`}>
                      What your habits are worth, in realised P&amp;L
                    </div>
                  </div>
                </div>

                <div className={styles.leaks}>
                  {moneyOrder(findings)
                    .slice(0, 3)
                    .map((finding) => (
                      <div key={finding.key} className={styles.leakRow}>
                        <span className={`num ${styles.leakFigure}`}>
                          {finding.impact != null ? signedMoney(finding.impact) : "—"}
                        </span>
                        <span className={styles.leakText}>
                          <span className={styles.leakSentence}>{finding.sentence}</span>
                          <span className={styles.leakEvidence}>{finding.evidence}</span>
                        </span>
                      </div>
                    ))}
                </div>

                <div className={screen.chips}>
                  <Link href="/patterns" className={screen.chip}>
                    Open Patterns
                  </Link>
                </div>
                <p className={screen.tail}>
                  Every figure is realised P&amp;L from your own brokerage — what the
                  habit actually returned, never a projection.
                </p>
              </section>
            ) : null}

            {/* 3 — identity, beside the money read. */}
            <section
              data-reveal
              className={`${screen.panel} ${styles.archetype} ${findings.length ? "" : styles.span}`}
              style={{ animationDelay: "0.04s" }}
            >
              <div className={styles.archText}>
                <Avatar archetype={archetype.key} size={52} />
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
              <div className={styles.archActions}>
                <Link href="/dna" className={styles.openDna}>
                  Open DNA
                </Link>
                <ShareButton type="archetype" label="your archetype" size={44} />
              </div>
            </section>

            {/* 4 — the loop the engine runs on: two taps here become the
                next dollar figure above. It spans, because the queue is a row
                of choices and half a row is a cramped one. */}
            <section data-reveal className={`${screen.panel} ${styles.span}`} style={{ animationDelay: "0.03s" }}>
              <TagPrompt queue={queue} tagged={tagged} total={Math.max(taggable, tagged)} />
            </section>

            {/* 4 — P&L, mirrored. */}
            {wave.length > 1 ? (
              <section data-reveal className={`${screen.panel} ${styles.span}`} style={{ animationDelay: "0.05s" }}>
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
                  <ShareButton type="monthlyPnl" label="this chart" size={34} />
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
            <section data-reveal className={`${screen.panel} ${styles.span}`} style={{ animationDelay: "0.06s" }}>
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

            {/*
              * 6 — the session recap. Real for the tier that owns it; for
              * everyone else the lock occupies the slot its unlocked twin
              * would take, previewing the shape with example figures.
              */}
            {can({ tier }, "sessionRecapCard") && recap && recap.closed > 0 ? (
              <section data-reveal className={screen.panel} style={{ animationDelay: "0.08s" }}>
                <div className={screen.head}>
                  <div className={screen.headText}>
                    <span className={screen.eyebrow}>Session recap · {recap.date}</span>
                    <div className={`disp ${screen.h2}`}>
                      {recap.wins} of {recap.closed} closed green
                    </div>
                  </div>
                </div>
                <div className={styles.recap}>
                  {[
                    [`${recap.winRate}%`, "Win rate"],
                    [String(recap.closed), "Positions closed"],
                    [signedMoney(recap.pnl), "Session P&L"],
                  ].map(([v, l]) => (
                    <div key={l} className={screen.sunken}>
                      <div className={`num ${styles.recapValue}`}>{v}</div>
                      <div className={screen.tail}>{l}</div>
                    </div>
                  ))}
                </div>
              </section>
            ) : !can({ tier }, "sessionRecapCard") ? (
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
            ) : null}

            {pulse ? (
              <div className={`${screen.panel} ${styles.span}`}>
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
          </div>
        </div>
      </div>
    </>
  );
}
