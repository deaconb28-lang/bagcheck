import type { Metadata } from "next";
import { getUserId } from "@/auth";
import { isDbConfigured, loadScreen, syncClock } from "@/lib/db";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { SignInCta } from "@/components/app/SignInCta";
import { WrappedView } from "./WrappedView";
import { archetypeOf, weekDelta } from "../derive";

export const metadata: Metadata = { title: "Bagcheck — Wrapped" };
export const dynamic = "force-dynamic";

export default async function WrappedPage() {
  const userId = await getUserId();
  if (!userId || !isDbConfigured()) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · wrapped"
          icon="signin"
          title="Nothing archived yet"
          body={userId ? "The ledger store is not configured." : "Sign in to see your year."}
          actions={[{ label: "Back to the landing page", href: "/", ghost: true }]}
        >
          <SignInCta />
        </EmptyState>
      </PageGrid>
    );
  }

  const data = await loadScreen(userId, 400);
  if (!data.scores.length) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · wrapped"
          icon={data.connection ? "waiting" : "connect"}
          title={data.connection ? "No scored days yet" : "Connect a brokerage"}
          body="Wrapped assembles from your scored days. The first one appears once your history is synced and scored."
          actions={[{ label: "Open the ledger view", href: "/debug" }]}
        />
      </PageGrid>
    );
  }

  // Read, not recomputed — see lib/db/derived.ts.
  const trips = data.derived?.roundTrips ?? [];
  const hold = data.derived?.holdTime ?? {
    winnersMean: null,
    losersMean: null,
    winners: 0,
    losers: 0,
  };

  const latest = data.scores[0];
  const best = trips.reduce<(typeof trips)[number] | null>(
    (b, t) => (!b || t.pnl > b.pnl ? t : b),
    null,
  );
  const longest = trips.reduce<(typeof trips)[number] | null>(
    (b, t) => (!b || t.holdDays > b.holdDays ? t : b),
    null,
  );

  return (
    <WrappedView
      year={new Date().getUTCFullYear()}
      archetype={archetypeOf(latest.components as unknown as Record<string, number>)}
      scoredDays={data.scores.length}
      transactionCount={data.transactionCount}
      winnerHold={hold.winnersMean}
      loserHold={hold.losersMean}
      bestDecision={best}
      longestHold={longest}
      score={latest.score}
      delta={weekDelta(data.scores)}
      syncedAt={syncClock(data.connection?.lastSyncAt)}
      tier={data.tier}
    />
  );
}
