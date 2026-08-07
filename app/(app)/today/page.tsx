import type { Metadata } from "next";
import Link from "next/link";
import { getUserId, isAuthConfigured } from "@/auth";
import { getCollections, isDbConfigured } from "@/lib/db";
import type { ScoreDoc } from "@/lib/db";
import { Button, Eyebrow, Row } from "@/components/primitives";
import styles from "./today.module.css";

export const metadata: Metadata = { title: "Bagcheck — today" };
export const dynamic = "force-dynamic";

const TONE_LABEL = "Discipline";

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function sentenceFor(doc: ScoreDoc, previous: ScoreDoc | null): string {
  const top = doc.contributors[0];
  if (!top) {
    return "Not enough history yet to describe your week.";
  }
  if (previous && doc.score > previous.score) {
    return `${top.name}. Your score moved up ${doc.score - previous.score}.`;
  }
  if (previous && doc.score < previous.score) {
    return `${top.name}. Your score moved down ${previous.score - doc.score}.`;
  }
  return `${top.name}.`;
}

export default async function TodayPage() {
  const userId = await getUserId();

  if (!userId) {
    return (
      <main className={styles.page}>
        <Eyebrow>Bagcheck</Eyebrow>
        <h1 className={`disp ${styles.h1}`}>Today</h1>
        <p className={styles.body}>
          {isAuthConfigured()
            ? "Sign in to see your score."
            : "Sign-in is not configured on this deployment."}
        </p>
        <div className={styles.actions}>
          <Button href="/">Back to the landing page</Button>
        </div>
      </main>
    );
  }

  if (!isDbConfigured()) {
    return (
      <main className={styles.page}>
        <Eyebrow>Bagcheck</Eyebrow>
        <h1 className={`disp ${styles.h1}`}>Today</h1>
        <p className={styles.body}>The ledger store is not configured yet.</p>
      </main>
    );
  }

  const { scores } = await getCollections();
  const recent = await scores.find({ userId }).sort({ date: -1 }).limit(8).toArray();
  const latest = recent[0] ?? null;
  const previous = recent[1] ?? null;
  // Oldest of the trailing week gives the "+3 this week" delta.
  const weekStart = recent.length > 1 ? recent[recent.length - 1] : null;
  const weekDelta = latest && weekStart ? latest.score - weekStart.score : null;

  if (!latest) {
    return (
      <main className={styles.page}>
        <Eyebrow>Bagcheck</Eyebrow>
        <h1 className={`disp ${styles.h1}`}>No score yet</h1>
        <p className={styles.body}>
          Connect a brokerage and run a sync — your score builds from the
          history that comes back.
        </p>
        <div className={styles.actions}>
          <Button href="/debug">Open the ledger</Button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <Eyebrow>{formatDate(latest.date)} · {latest.baseline}</Eyebrow>

      <h1 className={`disp ${styles.sentence}`}>{sentenceFor(latest, previous)}</h1>

      <div className={styles.scoreline}>
        <span className={`num ${styles.score}`}>{latest.score}</span>
        <Eyebrow>
          {TONE_LABEL}
          {weekDelta != null && weekDelta !== 0
            ? ` · ${weekDelta > 0 ? "+" : ""}${weekDelta} this week`
            : ""}
        </Eyebrow>
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

      <section className={styles.block}>
        <Eyebrow>Components</Eyebrow>
        <div className={styles.rows}>
          <Row name="Adherence" fill={latest.components.adherence} value={`${latest.components.adherence}`} tone="gold" />
          <Row name="Consistency" fill={latest.components.consistency} value={`${latest.components.consistency}`} tone="gold" />
          <Row name="Patience" fill={latest.components.patience} value={`${latest.components.patience}`} tone="gold" />
          <Row name="Exposure" fill={latest.components.exposure} value={`${latest.components.exposure}`} tone="violet" />
        </div>
      </section>

      {previous ? (
        <p className={styles.body}>
          Previous reading: {previous.score} on {formatDate(previous.date)}.
        </p>
      ) : null}

      <div className={styles.actions}>
        <Link className={styles.link} href="/debug">
          Raw ledger
        </Link>
      </div>
    </main>
  );
}
