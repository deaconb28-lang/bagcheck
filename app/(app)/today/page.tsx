import type { Metadata } from "next";
import { getUserId, isAuthConfigured } from "@/auth";
import {
  factsFrom,
  getDailyInsight,
  getPulse,
  isDbConfigured,
  loadAppData,
  questionFor,
} from "@/lib/db";
import { activeStreaks, disciplineSegments } from "@/lib/score";
import { Card, Chip, Eyebrow, Row } from "@/components/primitives";
import { DayGrid } from "@/components/idioms";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { PulseSurvey } from "@/components/app/PulseSurvey";
import { SignInCta } from "@/components/app/SignInCta";
import styles from "./today.module.css";

export const metadata: Metadata = { title: "Bagcheck — today" };
export const dynamic = "force-dynamic";

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default async function TodayPage() {
  const userId = await getUserId();

  if (!userId) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · today"
          title="Sign in to see your score"
          body={
            isAuthConfigured()
              ? "Your Discipline score is built from your own brokerage history."
              : "Sign-in is not configured on this deployment yet."
          }
          actions={[{ label: "Back to the landing page", href: "/", ghost: true }]}
        >
          <SignInCta />
        </EmptyState>
      </PageGrid>
    );
  }

  if (!isDbConfigured()) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · today"
          title="The ledger store is not configured"
          body="Set MONGODB_URI on this deployment to store synced history and scores."
          actions={[{ label: "Open the ledger view", href: "/debug" }]}
        />
      </PageGrid>
    );
  }

  const { connection, scores, transactionCount } = await loadAppData(userId, 63);
  const latest = scores[0] ?? null;
  const previous = scores[1] ?? null;

  if (!latest) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · today"
          title={connection ? "No score yet" : "Connect a brokerage"}
          body={
            connection
              ? `Your ledger holds ${transactionCount} transactions. Recompute builds your first score from them.`
              : "One tap via SnapTrade, read-only. Your history arrives in full, and the first score follows."
          }
          actions={[{ label: "Open the ledger view", href: "/debug" }]}
        />
      </PageGrid>
    );
  }

  // The week is the last seven scored days, not the last seven calendar days.
  const week = scores.slice(0, 7);
  const weekStart = week.length > 1 ? week[week.length - 1] : null;
  const weekDelta = weekStart ? latest.score - weekStart.score : null;

  const [insight, pulse] = await Promise.all([
    getDailyInsight(
      userId,
      factsFrom(latest, previous, weekStart, transactionCount, connection?.accounts.length ?? 0),
    ),
    getPulse(userId, latest.date),
  ]);

  const streaks = activeStreaks(scores);
  const segments = disciplineSegments(scores, 42);
  const question = questionFor(latest.date);

  const rail = (
    <>
      <Card tight>
        <div className={styles.railBlock}>
          <Eyebrow>Components</Eyebrow>
          <div className={styles.rows}>
            <Row name="Adherence" fill={latest.components.adherence} value={`${latest.components.adherence}`} tone="gold" />
            <Row name="Consistency" fill={latest.components.consistency} value={`${latest.components.consistency}`} tone="gold" />
            <Row name="Patience" fill={latest.components.patience} value={`${latest.components.patience}`} tone="gold" />
            <Row name="Exposure" fill={latest.components.exposure} value={`${latest.components.exposure}`} tone="violet" />
          </div>
        </div>
      </Card>
      <Card tight>
        <div className={styles.railBlock}>
          <Eyebrow>Last {segments.length} days</Eyebrow>
          <DayGrid days={segments} />
          <p className={styles.railBody}>
            {transactionCount} transactions across {connection?.accounts.length ?? 0}{" "}
            {connection?.accounts.length === 1 ? "account" : "accounts"}. Last sync{" "}
            {connection?.lastSyncAt ? connection.lastSyncAt.toISOString().slice(0, 10) : "never"}.
          </p>
        </div>
      </Card>
    </>
  );

  return (
    <PageGrid rail={rail}>
      <div className={styles.scroll}>
        {/* 1 — the date */}
        <Eyebrow>{formatDate(latest.date)}</Eyebrow>

        {/* 2 — the sentence */}
        <h1 className={`disp ${styles.sentence}`}>{insight.sentence}</h1>

        {/* 3 — the score, the one hero number on this screen */}
        <div className={styles.scoreblock}>
          <div className={styles.scoreline}>
            <span className={`num ${styles.score}`}>{latest.score}</span>
            <Eyebrow>
              Discipline
              {weekDelta != null && weekDelta !== 0
                ? ` · ${weekDelta > 0 ? "+" : "−"}${Math.abs(weekDelta)} this week`
                : ""}
            </Eyebrow>
          </div>
          {insight.tail ? <p className={styles.tail}>{insight.tail}</p> : null}
        </div>

        {/* 4 — what moved it, four rows max */}
        {latest.contributors.length ? (
          <section className={styles.block}>
            <Eyebrow>What moved your score</Eyebrow>
            <div className={styles.rows}>
              {latest.contributors.slice(0, 4).map((contributor) => (
                <Row
                  key={contributor.name}
                  name={contributor.name}
                  fill={Math.min(100, Math.abs(contributor.value) * 11)}
                  value={`${contributor.value > 0 ? "+" : "−"}${Math.abs(contributor.value)}`}
                  tone={contributor.tone}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* 5 — the pulse, gone once answered */}
        {pulse ? null : (
          <PulseSurvey
            date={latest.date}
            question={question.question}
            options={question.options}
          />
        )}

        {/* 6 — streaks at stake */}
        {streaks.length ? (
          <section className={styles.block}>
            <Eyebrow>Streaks at stake</Eyebrow>
            <div className={styles.chips}>
              {streaks.map((streak) => (
                <Chip key={streak.name}>
                  {streak.days} {streak.name}
                </Chip>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </PageGrid>
  );
}
