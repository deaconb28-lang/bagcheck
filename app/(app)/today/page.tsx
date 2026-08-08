import type { Metadata } from "next";
import { getUserId, isAuthConfigured } from "@/auth";
import {
  factsFrom,
  getDailyInsight,
  getPulse,
  holdingsFrom,
  isDbConfigured,
  loadAppData,
  questionFor,
} from "@/lib/db";
import { normalizeSymbol } from "@/lib/logos";
import { earningsFor, isMarketConfigured } from "@/lib/market";
import { activeStreaks, disciplineSegments } from "@/lib/score";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { SignInCta } from "@/components/app/SignInCta";
import { TodayView } from "./TodayView";

export const metadata: Metadata = { title: "Bagcheck — today" };
export const dynamic = "force-dynamic";

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

  const { connection, scores, snapshots, transactionCount } = await loadAppData(userId, 63);
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

  // Names already held, for the reporting calendar. A scheduled date is a
  // fact about the company, not a prompt to do anything about it.
  const held = holdingsFrom(snapshots)
    .map((holding) => normalizeSymbol(holding.symbol))
    .filter((symbol): symbol is string => symbol != null);

  const [insight, pulse, reporting] = await Promise.all([
    getDailyInsight(
      userId,
      factsFrom(latest, previous, weekStart, transactionCount, connection?.accounts.length ?? 0),
    ),
    getPulse(userId, latest.date),
    isMarketConfigured() ? earningsFor(held) : Promise.resolve([]),
  ]);

  const streaks = activeStreaks(scores);
  const segments = disciplineSegments(scores, 42);
  const question = questionFor(latest.date);

  return (
    <TodayView
      date={latest.date}
      score={latest.score}
      weekDelta={weekDelta}
      components={latest.components}
      contributors={latest.contributors}
      insight={insight}
      streaks={streaks}
      segments={segments}
      transactionCount={transactionCount}
      accountCount={connection?.accounts.length ?? 0}
      lastSync={connection?.lastSyncAt ? connection.lastSyncAt.toISOString().slice(0, 10) : null}
      pulse={pulse ? null : { question: question.question, options: question.options }}
      reporting={reporting}
    />
  );
}
