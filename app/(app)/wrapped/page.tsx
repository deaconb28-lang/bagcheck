import type { Metadata } from "next";
import { getUserId } from "@/auth";
import { getCollections, isDbConfigured, loadScreen, syncClock } from "@/lib/db";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { SignInCta } from "@/components/app/SignInCta";
import { WrappedView } from "./WrappedView";
import { assembleWrapped } from "./assemble";
import { archetypeOf, weekDelta } from "../derive";

export const metadata: Metadata = { title: "Bagcheck — Wrapped" };
export const dynamic = "force-dynamic";

export default async function WrappedPage({
  searchParams,
}: {
  searchParams: Promise<{ play?: string; w?: string }>;
}) {
  const { play, w } = await searchParams;
  const userId = await getUserId();
  if (!userId || !isDbConfigured()) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · wrapped"
          icon={userId ? "setup" : "signin"}
          title={userId ? "Configure the ledger store" : "Sign in to play your year"}
          body={
            userId
              ? "Set MONGODB_URI on this deployment to store synced history and scores."
              : "Twelve cards and a story player, assembled from your scored year."
          }
          actions={[{ label: "Back to the landing page", href: "/", ghost: true }]}
        >
          {userId ? null : <SignInCta />}
        </EmptyState>
      </PageGrid>
    );
  }

  const assembled = await assembleWrapped(userId, w);
  if (!assembled) {
    const data = await loadScreen(userId, 400);
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
  const { data, cards, label, q, yearNum, windows, hold, scores, latest, trips } = assembled;
  const best = trips.reduce<(typeof trips)[number] | null>(
    (b, t) => (!b || t.pnl > b.pnl ? t : b),
    null,
  );
  const longest = trips.reduce<(typeof trips)[number] | null>(
    (b, t) => (!b || t.holdDays > b.holdDays ? t : b),
    null,
  );

  /*
   * The hero card's slug, if this user has already minted it — that is what
   * points the card at its own generated art rather than at nothing.
   */
  const { cards: cardDocs } = await getCollections();
  const mintedSlug =
    (
      await cardDocs.findOne(
        { userId, type: cards[0]?.kind },
        { sort: { mintedAt: -1 }, projection: { _id: 0, slug: 1 } },
      )
    )?.slug ?? null;

  if (!cards.length) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow={`Bagcheck · wrapped · ${label}`}
          icon="waiting"
          title={q == null ? "No card earned yet" : `Nothing cleared a floor in ${label}`}
          body="Cards are minted from behaviour the ledger can prove. A window with too little history in it stays quiet rather than inventing one."
          actions={[
            { label: "Open the ledger view", href: "/debug" },
            ...(q != null ? [{ label: "Back to the year", href: "/wrapped", ghost: true }] : []),
          ]}
        />
      </PageGrid>
    );
  }

  return (
    <WrappedView
      year={yearNum}
      label={label}
      windows={windows}
      archetype={archetypeOf(latest.components as unknown as Record<string, number>)}
      scoredDays={scores.length}
      transactionCount={data.transactionCount}
      winnerHold={hold.winnersMean}
      loserHold={hold.losersMean}
      /*
       * Every card the ledger has earned, built by the same twelve kinds the
       * marketing page renders. A kind below its sample floor is absent
       * rather than empty — see lib/cards/kinds.ts.
       */
      cards={cards}
      mintedSlug={mintedSlug}
      autoplay={play === "1"}
      bestDecision={best}
      longestHold={longest}
      score={latest.score}
      delta={weekDelta(data.scores)}
      syncedAt={syncClock(data.connection?.lastSyncAt)}
      tier={data.tier}
    />
  );
}
