import type { Metadata } from "next";
import { getUserId, isAuthConfigured } from "@/auth";
import {
  factsFrom,
  getCollections,
  getDailyInsight,
  isDbConfigured,
  loadScreen,
  syncClock,
  taggedOpensFor,
} from "@/lib/db";
import { untaggedQueue } from "@/lib/tags";
import { assembleWrappedFrom } from "@/lib/wrapped/assemble";
import { storedPhotos } from "@/lib/unsplash";
import type { UntaggedEntry } from "@/lib/tags";
import { EmptyState } from "@/components/app/EmptyState";
import { FirstScore } from "@/components/app/FirstScore";
import { PageGrid } from "@/components/app/PageGrid";
import { SignInCta } from "@/components/app/SignInCta";
import { SyncDialog } from "@/components/app/SyncDialog";
import { trialLine, trialState } from "@/lib/tiers";
import { HomeView } from "./HomeView";
import type { WaveDay } from "@/components/idioms";
import {
  currentStreak,
  waveSummary,
  weekDelta,
} from "../derive";

export const metadata: Metadata = { title: "Bagcheck — home" };
export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>;
}) {
  const userId = await getUserId();
  const { connected } = await searchParams;
  /*
   * The brokerage callback lands here with ?connected=1 and nothing synced
   * yet, so the dialog is what starts the sync as well as what reports it.
   * It renders over whichever branch below is showing — usually the "no score
   * yet" empty state, which is exactly what it is about to fill in.
   */
  const syncDialog =
    connected === "1" && userId ? (
      <SyncDialog
        today={new Date().toISOString().slice(0, 10)}
        trialLine={trialLine(trialState(new Date(), new Date()))}
      />
    ) : null;

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
          title="Configure the ledger store"
          body="Set MONGODB_URI on this deployment to store synced history and scores."
          actions={[{ label: "Connect a brokerage", href: "/start" }]}
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
              ? `Your ledger holds ${data.transactionCount.toLocaleString("en-US")} transactions. Scoring reads them and builds the dashboard.`
              : "One tap via SnapTrade, read-only. Your history arrives in full, and the first score follows."
          }
          actions={
            data.connection
              ? [{ label: "See your Wrapped", href: "/wrapped", ghost: true }]
              : [{ label: "Connect a brokerage", href: "/start" }]
          }
        >
          {/*
            * A connected account with no score is a screen the reader can act
            * on, not a note telling them to wait for a cron. The first sync
            * scores as it finishes, so this is the fallback rather than the
            * usual path.
            */}
          {data.connection ? <FirstScore /> : null}
        </EmptyState>
        {syncDialog}
      </PageGrid>
    );
  }

  const { transactions, tags } = await getCollections();
  /*
   * Wrapped is a first-class panel on the dashboard now rather than a route
   * you have to know about, so the deck is assembled here alongside
   * everything else — out of the screen this page has *already* loaded.
   * `assembleWrapped` would re-read the same 400 scores for the same
   * document; `assembleWrappedFrom` takes the one in hand and the tag opens
   * it needs for conviction, which is the only read this panel adds.
   */
  const [recent, taggedDocs, insight, opens, photos] = await Promise.all([
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
    taggedOpensFor(userId),
    storedPhotos(),
  ]);

  const wrapped = assembleWrappedFrom(data, opens);

  /*
   * The wave is read, not computed. This used to pull four thousand rows on
   * every navigation; the derived document holds the same series, rebuilt
   * only when the ledger actually moves.
   */
  const wave: WaveDay[] = (data.derived?.dailyPnl ?? [])
    .slice(-63)
    .map((d) => ({ date: d.date, amount: d.realised }));
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

  return (
    <>
      {syncDialog}
      <HomeView
        score={latest.score}
        delta={weekDelta(data.scores)}
        components={latest.components}
        insight={insight}
        wave={wave}
        waveSummary={waveSummary(wave)}
        streak={currentStreak(data.scores)}
        scoredDays={data.scores.length}
        queue={queue}
        tagged={data.tagged}
        taggable={data.taggable}
        tier={data.tier}
        syncedAt={syncClock(data.connection?.lastSyncAt)}
        date={latest.date}
        wrapped={
          wrapped
            ? { year: wrapped.label, cards: wrapped.cards, photos }
            : null
        }
      />
    </>
  );
}
