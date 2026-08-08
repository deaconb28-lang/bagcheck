import { Card, Chip, Eyebrow, Logo, Row } from "@/components/primitives";
import { DayGrid } from "@/components/idioms";
import { PageGrid } from "@/components/app/PageGrid";
import { PageHeader } from "@/components/app/PageHeader";
import { PulseSurvey } from "@/components/app/PulseSurvey";
import { ShareButton } from "@/components/app/ShareButton";
import { contributorTone } from "@/lib/score";
import type { DayState } from "@/components/idioms";
import type { Contributor, ScoreComponents } from "@/lib/score";
import styles from "./today.module.css";

export type TodayViewProps = {
  date: string;
  score: number;
  weekDelta: number | null;
  components: ScoreComponents;
  contributors: Contributor[];
  /** The written readout. Bagcheck produced this on its own. */
  insight: { sentence: string; tail?: string | null };
  streaks: Array<{ name: string; days: number }>;
  segments: DayState[];
  transactionCount: number;
  accountCount: number;
  lastSync: string | null;
  /** Null once the day's pulse is answered. */
  pulse: { question: string; options: readonly string[] } | null;
  /** Reporting dates for names already held. A schedule, never a signal. */
  reporting: Array<{ symbol: string; date: string; hour: string | null }>;
};

/** Finnhub's session codes, spelled out. Anything else is left unsaid. */
const SESSION: Record<string, string> = {
  bmo: "before open",
  amc: "after close",
  dmh: "during hours",
};

function formatDay(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Today. The order the spec fixes — date, sentence, score, contributors,
 * pulse, streaks — laid out as the handoff lays out a screen: a header
 * floating on the canvas, then cards.
 */
export function TodayView(props: TodayViewProps) {
  const {
    date,
    score,
    weekDelta,
    components,
    contributors,
    insight,
    streaks,
    segments,
    transactionCount,
    accountCount,
    lastSync,
    pulse,
    reporting,
  } = props;

  const rail = (
    <>
      <Card tight>
        <div className={styles.railBlock}>
          <Eyebrow>Components</Eyebrow>
          <div className={styles.rows}>
            <Row name="Adherence" fill={components.adherence} value={`${components.adherence}`} tone="moss" />
            <Row name="Consistency" fill={components.consistency} value={`${components.consistency}`} tone="moss" />
            <Row name="Patience" fill={components.patience} value={`${components.patience}`} tone="moss" />
            <Row name="Exposure" fill={components.exposure} value={`${components.exposure}`} tone="signal" />
          </div>
        </div>
      </Card>
      <Card tight>
        <div className={styles.railBlock}>
          <Eyebrow>Last {segments.length} days</Eyebrow>
          <DayGrid days={segments} />
          <p className={styles.railBody}>
            {transactionCount.toLocaleString("en-US")} transactions across {accountCount}{" "}
            {accountCount === 1 ? "account" : "accounts"}. Last sync {lastSync ?? "never"}.
          </p>
        </div>
      </Card>
      {reporting.length ? (
        <Card tight>
          <div className={styles.railBlock}>
            <Eyebrow>Reporting soon</Eyebrow>
            <ul className={styles.reporting}>
              {reporting.slice(0, 5).map((event) => (
                <li key={`${event.symbol}-${event.date}`} className={styles.report}>
                  <span className={styles.reportName}>
                    <Logo symbol={event.symbol} size={22} />
                    {event.symbol}
                  </span>
                  <span className={styles.reportWhen}>
                    {formatDay(event.date)}
                    {event.hour && SESSION[event.hour] ? ` · ${SESSION[event.hour]}` : ""}
                  </span>
                </li>
              ))}
            </ul>
            <p className={styles.railBody}>
              Dates these companies have set, for names already in your ledger.
            </p>
          </div>
        </Card>
      ) : null}
    </>
  );

  return (
    <PageGrid rail={rail}>
      <PageHeader
        title="Today"
        subtitle={`${formatDate(date)} · scored overnight`}
        aside={<Chip tone="accent">Written by Bagcheck</Chip>}
      />

      {/* The one hero on the screen: what you did, and the number for it. */}
      <Card hero>
        <div className={styles.hero}>
          <p className={styles.sentence}>{insight.sentence}</p>
          <div className={styles.scoreline}>
            <span className={`num ${styles.score}`}>{score}</span>
            <span className={styles.scoreLabel}>
              Discipline
              {weekDelta != null && weekDelta !== 0
                ? ` · ${weekDelta > 0 ? "+" : "−"}${Math.abs(weekDelta)} this week`
                : ""}
            </span>
          </div>
          {insight.tail ? <p className={styles.tail}>{insight.tail}</p> : null}
          <div className={styles.share}>
            <ShareButton kind="score" label="Make a share card" />
          </div>
        </div>
      </Card>

      {contributors.length ? (
        <Card>
          <div className={styles.block}>
            <h2 className={`disp ${styles.h2}`}>What moved your score</h2>
            <div className={styles.rows}>
              {contributors.slice(0, 4).map((contributor) => (
                <Row
                  key={contributor.name}
                  name={contributor.name}
                  fill={Math.min(100, Math.abs(contributor.value) * 11)}
                  value={`${contributor.value > 0 ? "+" : "−"}${Math.abs(contributor.value)}`}
                  tone={contributorTone(contributor.tone)}
                />
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      {pulse ? (
        <Card>
          <PulseSurvey date={date} question={pulse.question} options={pulse.options} />
        </Card>
      ) : null}

      {streaks.length ? (
        <Card>
          <div className={styles.block}>
            <h2 className={`disp ${styles.h2}`}>Streaks at stake</h2>
            <div className={styles.chips}>
              {streaks.map((streak) => (
                <Chip key={streak.name} tone="neutral">
                  {streak.days} {streak.name}
                </Chip>
              ))}
            </div>
          </div>
        </Card>
      ) : null}
    </PageGrid>
  );
}
