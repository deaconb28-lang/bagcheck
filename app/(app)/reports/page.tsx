import type { Metadata } from "next";
import { getUserId } from "@/auth";
import { isDbConfigured, loadAppData } from "@/lib/db";
import { Card, Eyebrow } from "@/components/primitives";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { SignInCta } from "@/components/app/SignInCta";
import { ScoreHistory } from "./ScoreHistory";
import styles from "./reports.module.css";

export const metadata: Metadata = { title: "Bagcheck — reports" };
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const userId = await getUserId();

  if (!userId || !isDbConfigured()) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · reports"
          title="Nothing to report yet"
          body={
            userId
              ? "The ledger store is not configured on this deployment."
              : "Sign in to see your reports."
          }
          actions={[{ label: "Back to the landing page", href: "/", ghost: true }]}
        >
          <SignInCta />
        </EmptyState>
      </PageGrid>
    );
  }

  const { scores } = await loadAppData(userId, 90);

  if (scores.length === 0) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · reports"
          title="No scored days yet"
          body="Reports assemble from your daily scores. The first one appears after your history is synced and scored."
          actions={[{ label: "Open the ledger view", href: "/debug" }]}
        />
      </PageGrid>
    );
  }

  const ordered = [...scores].reverse(); // oldest → newest
  const latest = scores[0];
  const best = scores.reduce((top, doc) => (doc.score > top.score ? doc : top), scores[0]);
  const average = Math.round(
    scores.reduce((sum, doc) => sum + doc.score, 0) / scores.length,
  );

  // How often each contributor has appeared — the recurring pattern.
  const tally = new Map<string, { count: number; total: number; tone: string }>();
  for (const doc of scores) {
    for (const contributor of doc.contributors) {
      const entry = tally.get(contributor.name) ?? {
        count: 0,
        total: 0,
        tone: contributor.tone,
      };
      entry.count += 1;
      entry.total += contributor.value;
      tally.set(contributor.name, entry);
    }
  }
  const recurring = [...tally.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  const rail = (
    <Card tight>
      <div className={styles.railBlock}>
        <Eyebrow>Across {scores.length} scored days</Eyebrow>
        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt className={styles.statKey}>Average</dt>
            <dd className={styles.statVal}>{average}</dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statKey}>Best</dt>
            <dd className={styles.statVal}>
              {best.score} · {best.date}
            </dd>
          </div>
          <div className={styles.stat}>
            <dt className={styles.statKey}>Latest</dt>
            <dd className={styles.statVal}>
              {latest.score} · {latest.date}
            </dd>
          </div>
        </dl>
      </div>
    </Card>
  );

  return (
    <PageGrid rail={rail}>
      <div className={styles.head}>
        <Eyebrow>Reports</Eyebrow>
        <h1 className={`disp ${styles.title}`}>Your score over time</h1>
      </div>

      <section className={styles.block}>
        <Eyebrow>Discipline · {ordered.length} days</Eyebrow>
        <ScoreHistory series={ordered.map((doc) => ({ date: doc.date, score: doc.score }))} />
      </section>

      {recurring.length ? (
        <section className={styles.block}>
          <Eyebrow>What keeps showing up</Eyebrow>
          <div className={styles.recurring}>
            {recurring.map(([name, entry]) => (
              <div key={name} className={styles.recurringRow}>
                <span className={styles.recurringName}>{name}</span>
                <span className={styles.recurringCount}>
                  {entry.count} {entry.count === 1 ? "day" : "days"}
                </span>
                <span className={styles.recurringVal} data-tone={entry.tone}>
                  {entry.total > 0 ? "+" : "−"}
                  {Math.abs(entry.total)}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.block}>
        <Eyebrow>Quarterly report</Eyebrow>
        <p className={styles.body}>
          The written quarterly report and the Wrapped archive assemble here
          once a full quarter of scored days is behind you. You have{" "}
          {scores.length} of 63.
        </p>
      </section>
    </PageGrid>
  );
}
