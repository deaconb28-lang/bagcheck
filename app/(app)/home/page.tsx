import type { Metadata } from "next";
import { getUserId, isAuthConfigured } from "@/auth";
import {
  factsFrom,
  getCollections,
  getDailyInsight,
  getPulse,
  isDbConfigured,
  loadScreen,
  questionFor,
  syncClock,
} from "@/lib/db";
import { untaggedQueue } from "@/lib/tags";
import type { UntaggedEntry } from "@/lib/tags";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { SignInCta } from "@/components/app/SignInCta";
import { HomeView } from "./HomeView";
import {
  archetypeOf,
  currentStreak,
  dailyPnl,
  heatFromScores,
  longestStreak,
  waveSummary,
  weekDelta,
} from "../derive";

export const metadata: Metadata = { title: "Bagcheck — home" };
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const userId = await getUserId();

  if (!userId) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · home"
          icon="signin"
          title="Sign in to see your score"
          body={
            isAuthConfigured()
              ? "Your Health score is built from your own brokerage history."
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
          eyebrow="Bagcheck · home"
          icon="setup"
          title="The ledger store is not configured"
          body="Set MONGODB_URI on this deployment to store synced history and scores."
          actions={[{ label: "Open the ledger view", href: "/debug" }]}
        />
      </PageGrid>
    );
  }

  const data = await loadScreen(userId);
  const latest = data.scores[0] ?? null;

  if (!latest) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · home"
          icon={data.connection ? "waiting" : "connect"}
          title={data.connection ? "No score yet" : "Connect a brokerage"}
          body={
            data.connection
              ? `Your ledger holds ${data.transactionCount} transactions. Recompute builds your first score from them.`
              : "One tap via SnapTrade, read-only. Your history arrives in full, and the first score follows."
          }
          actions={[{ label: "Open the ledger view", href: "/debug" }]}
        />
      </PageGrid>
    );
  }

  const { transactions, tags } = await getCollections();
  const [recent, taggedDocs, pulse, insight] = await Promise.all([
    transactions
      .find({ userId, type: { $regex: /buy/i } })
      .sort({ date: -1 })
      .limit(60)
      .project<UntaggedEntry & { externalId: string }>({
        _id: 0,
        externalId: 1,
        symbol: 1,
        date: 1,
        amount: 1,
        units: 1,
        currency: 1,
      })
      .toArray(),
    tags.find({ userId }).project<{ transactionId: string }>({ _id: 0, transactionId: 1 }).toArray(),
    getPulse(userId, latest.date),
    getDailyInsight(
      userId,
      factsFrom(
        latest,
        data.scores[1] ?? null,
        data.scores.slice(0, 7).at(-1) ?? null,
        data.transactionCount,
        data.connection?.accounts.length ?? 0,
      ),
    ),
  ]);

  const allTransactions = await transactions
    .find({ userId })
    .sort({ date: -1 })
    .limit(4000)
    .toArray();

  const wave = dailyPnl(allTransactions);
  const queue = untaggedQueue(
    recent.map((r) => ({
      externalId: r.externalId,
      symbol: r.symbol ?? "—",
      date: r.date ?? "",
      amount: r.amount ?? null,
      units: r.units ?? null,
      currency: r.currency ?? null,
    })),
    new Set(taggedDocs.map((t) => t.transactionId)),
  );

  const question = questionFor(latest.date);

  return (
    <HomeView
      score={latest.score}
      delta={weekDelta(data.scores)}
      components={latest.components}
      insight={insight}
      archetype={archetypeOf(latest.components as unknown as Record<string, number>)}
      wave={wave}
      waveSummary={waveSummary(wave)}
      heat={heatFromScores(data.scores)}
      streak={currentStreak(data.scores)}
      longest={longestStreak(data.scores)}
      scoredDays={data.scores.length}
      queue={queue}
      tagged={data.tagged}
      taggable={data.taggable}
      tier={data.tier}
      syncedAt={syncClock(data.connection?.lastSyncAt)}
      accountCount={data.connection?.accounts.length ?? 0}
      transactionCount={data.transactionCount}
      pulse={pulse ? null : { question: question.question, options: question.options }}
      date={latest.date}
    />
  );
}
