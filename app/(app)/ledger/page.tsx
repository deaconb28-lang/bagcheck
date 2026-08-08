import type { Metadata } from "next";
import { getUserId } from "@/auth";
import { isDbConfigured, loadActivity, loadScreen, syncClock } from "@/lib/db";
import { getCollections } from "@/lib/db";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { SignInCta } from "@/components/app/SignInCta";
import { LedgerView } from "./LedgerView";
import { archetypeOf, currentStreak, dailyPnl, weekDelta } from "../derive";

export const metadata: Metadata = { title: "Bagcheck — ledger" };
export const dynamic = "force-dynamic";

export default async function LedgerPage() {
  const userId = await getUserId();
  if (!userId || !isDbConfigured()) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · ledger"
          icon="signin"
          title="Nothing to show yet"
          body={userId ? "The ledger store is not configured." : "Sign in to see your ledger."}
          actions={[{ label: "Back to the landing page", href: "/", ghost: true }]}
        >
          <SignInCta />
        </EmptyState>
      </PageGrid>
    );
  }

  const [data, page] = await Promise.all([
    loadScreen(userId, 400),
    loadActivity(userId, { limit: 40 }),
  ]);

  if (page.total === 0) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · ledger"
          icon={data.connection ? "sync" : "connect"}
          title={data.connection ? "No transactions synced" : "Connect a brokerage"}
          body={
            data.connection
              ? "Run a sync to pull your full transaction history from the brokerage."
              : "One tap via SnapTrade, read-only. Years of history arrive in about ninety seconds."
          }
          actions={[{ label: "Open DNA", href: "/dna" }]}
        />
      </PageGrid>
    );
  }

  const { transactions } = await getCollections();
  const all = await transactions.find({ userId }).sort({ date: -1 }).limit(4000).toArray();
  const latest = data.scores[0] ?? null;

  return (
    <>
      <ScreenHeader
        title="Ledger"
        meta={`${page.total.toLocaleString("en-US")} entries · read-only attestation`}
        score={latest?.score ?? null}
        delta={weekDelta(data.scores)}
        syncedAt={syncClock(data.connection?.lastSyncAt)}
        tier={data.tier}
      />
      <LedgerView
        rows={page.rows}
        kinds={page.kinds}
        total={page.total}
        tier={data.tier}
        score={latest?.score ?? null}
        archetype={archetypeOf(
          (latest?.components as unknown as Record<string, number>) ?? null,
        )}
        streak={currentStreak(data.scores)}
        wave={dailyPnl(all, 40)}
        scoredDays={data.scores.length}
      />
    </>
  );
}
