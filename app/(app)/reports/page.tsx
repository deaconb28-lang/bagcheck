import type { Metadata } from "next";
import { getUserId } from "@/auth";
import { isDbConfigured, loadAppData } from "@/lib/db";
import { contributorTone, disciplineSegments } from "@/lib/score";
import { Card, Eyebrow, Stat } from "@/components/primitives";
import { DayGrid, SegmentRing } from "@/components/idioms";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { PageHeader } from "@/components/app/PageHeader";
import { SignInCta } from "@/components/app/SignInCta";
import styles from "./reports.module.css";

export const metadata: Metadata = { title: "Bagcheck — reports" };
export const dynamic = "force-dynamic";

const QUARTER = 63;

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

  const { scores } = await loadAppData(userId, QUARTER);

  if (scores.length === 0) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · reports"
          title="No scored days yet"
          body="Reports assemble from your daily scores. The first one appears once your history is synced and scored."
          actions={[{ label: "Open the ledger view", href: "/debug" }]}
        />
      </PageGrid>
    );
  }

  const ordered = [...scores].reverse(); // oldest → newest
  const latest = scores[0];
  const best = scores.reduce((top, doc) => (doc.score > top.score ? doc : top), scores[0]);
  const average = Math.round(scores.reduce((sum, doc) => sum + doc.score, 0) / scores.length);
  const segments = disciplineSegments(scores, QUARTER);
  const kept = segments.filter((s) => s === "kept").length;

  // Which contributors keep returning — the recurring pattern, not one day.
  const tally = new Map<string, { count: number; total: number; tone: string }>();
  for (const doc of scores) {
    for (const contributor of doc.contributors) {
      const entry = tally.get(contributor.name) ?? { count: 0, total: 0, tone: contributor.tone };
      entry.count += 1;
      entry.total += contributor.value;
      tally.set(contributor.name, entry);
    }
  }
  const recurring = [...tally.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5);

  const rail = (
    <>
      <Card tight>
        <Stat
          eyebrow="Average discipline"
          value={average}
          unit={`over ${scores.length} days`}
          tone="moss"
          tail={`Your best reading was ${best.score} on ${best.date}.`}
        />
      </Card>
      <Card tight>
        <div className={styles.railBlock}>
          <Eyebrow>Latest</Eyebrow>
          <p className={styles.railBody}>
            {latest.score} on {latest.date}, scored against your {latest.baseline} baseline.
          </p>
        </div>
      </Card>
    </>
  );

  return (
    <PageGrid rail={rail}>
      <PageHeader
        title="Your quarter so far"
        subtitle={`${scores.length} of ${QUARTER} scored days · ${kept} inside your rules`}
      />

      <Card hero>
        <div className={styles.ring}>
          <SegmentRing days={segments} value={latest.score} label="Discipline" />
          <p className={styles.caption}>
            {QUARTER} trading days, one segment each. {kept} stayed inside your rules.
          </p>
        </div>
      </Card>

      <Card>
        <div className={styles.block}>
          <h2 className={`disp ${styles.h2}`}>The same quarter, unrolled</h2>
          <DayGrid
            days={segments}
            from={ordered[0]?.date}
            to={ordered[ordered.length - 1]?.date}
          />
        </div>
      </Card>

      {recurring.length ? (
        <Card>
          <div className={styles.block}>
            <h2 className={`disp ${styles.h2}`}>What keeps showing up</h2>
            <div className={styles.recurring}>
              {recurring.map(([name, entry]) => (
                <div key={name} className={styles.recurringRow}>
                  <span className={styles.recurringName}>{name}</span>
                  <span className={styles.recurringCount}>
                    {entry.count} {entry.count === 1 ? "day" : "days"}
                  </span>
                  <span className={styles.recurringVal} data-tone={contributorTone(entry.tone)}>
                    {entry.total > 0 ? "+" : "−"}
                    {Math.abs(entry.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <div className={styles.block}>
          <h2 className={`disp ${styles.h2}`}>The written report lands at the quarter</h2>
          <p className={styles.body}>
            The quarterly write-up and the Wrapped archive assemble here once a full
            quarter is behind you. You have {scores.length} of {QUARTER} days.
          </p>
        </div>
      </Card>
    </PageGrid>
  );
}
