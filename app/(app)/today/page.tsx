import type { Metadata } from "next";
import { getUserId, isAuthConfigured } from "@/auth";
import { isDbConfigured, loadAppData } from "@/lib/db";
import type { ScoreDoc } from "@/lib/db";
import { Card, Eyebrow, Row } from "@/components/primitives";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { SignInCta } from "@/components/app/SignInCta";
import styles from "./today.module.css";

export const metadata: Metadata = { title: "Bagcheck — today" };
export const dynamic = "force-dynamic";

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Describes what happened — never prescribes, never congratulates. */
function sentenceFor(doc: ScoreDoc, previous: ScoreDoc | null): string {
  const top = doc.contributors[0];
  if (!top) return "Not enough history yet to describe your week.";
  if (previous && doc.score !== previous.score) {
    const delta = doc.score - previous.score;
    return `${top.name}. Your score moved ${delta > 0 ? "up" : "down"} ${Math.abs(delta)}.`;
  }
  return `${top.name}.`;
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

  const { connection, scores, transactionCount } = await loadAppData(userId, 8);
  const latest = scores[0] ?? null;
  const previous = scores[1] ?? null;
  const weekStart = scores.length > 1 ? scores[scores.length - 1] : null;
  const weekDelta = latest && weekStart ? latest.score - weekStart.score : null;

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
          <Eyebrow>Ledger</Eyebrow>
          <p className={styles.railBody}>
            {transactionCount} transactions across{" "}
            {connection?.accounts.length ?? 0}{" "}
            {connection?.accounts.length === 1 ? "account" : "accounts"}.
          </p>
          <p className={styles.railBody}>
            Last sync{" "}
            {connection?.lastSyncAt
              ? connection.lastSyncAt.toISOString().slice(0, 10)
              : "never"}
            .
          </p>
        </div>
      </Card>
    </>
  );

  return (
    <PageGrid rail={rail}>
      <div className={styles.head}>
        <Eyebrow>
          {formatDate(latest.date)} · {latest.baseline}
        </Eyebrow>
        <h1 className={`disp ${styles.sentence}`}>{sentenceFor(latest, previous)}</h1>
        <div className={styles.scoreline}>
          <span className={`num ${styles.score}`}>{latest.score}</span>
          <Eyebrow>
            Discipline
            {weekDelta != null && weekDelta !== 0
              ? ` · ${weekDelta > 0 ? "+" : "−"}${Math.abs(weekDelta)} this week`
              : ""}
          </Eyebrow>
        </div>
      </div>

      {latest.contributors.length ? (
        <section className={styles.block}>
          <Eyebrow>What moved your score</Eyebrow>
          <div className={styles.rows}>
            {latest.contributors.map((contributor) => (
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

      {previous ? (
        <p className={styles.body}>
          Previous reading: {previous.score} on {formatDate(previous.date)}.
        </p>
      ) : null}
    </PageGrid>
  );
}
