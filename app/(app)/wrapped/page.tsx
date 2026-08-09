import type { Metadata } from "next";
import { getUserId } from "@/auth";
import { getCollections, isDbConfigured, loadScreen, syncClock } from "@/lib/db";
import { holdTimeFrom } from "@/lib/db/derived";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { SignInCta } from "@/components/app/SignInCta";
import { WrappedView } from "./WrappedView";
import { archetypeOf, currentStreak, longestStreak, weekDelta, weeklySessions } from "../derive";
import { buildCards } from "@/lib/cards/kinds";

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

  /*
   * The window. Wrapped is the annual archive by default, and any quarter
   * with data replays through the same twelve kinds — the doc's quarterly
   * earnings report, worn as cards. A quarter that has not happened yet is
   * not an option, and one with no realised day renders no chip.
   */
  const now = new Date();
  const yearNum = now.getUTCFullYear();
  const currentQ = Math.floor(now.getUTCMonth() / 3) + 1;
  const q = /^q[1-4]$/.test(w ?? "") && Number((w as string)[1]) <= currentQ
    ? Number((w as string)[1])
    : null;
  const qStart = (n: number) => `${yearNum}-${String((n - 1) * 3 + 1).padStart(2, "0")}-01`;
  const qEndEx = (n: number) => (n === 4 ? `${yearNum + 1}-01-01` : qStart(n + 1));
  const inWindow = (d: string) => (q == null ? true : d >= qStart(q) && d < qEndEx(q));
  const label = q == null ? String(yearNum) : `Q${q} ${yearNum}`;

  // Read, not recomputed — see lib/db/derived.ts — then sliced to the window.
  const allPnl = data.derived?.dailyPnl ?? [];
  const trips = (data.derived?.roundTrips ?? []).filter((t) => inWindow(t.closeDate));
  const dailyPnl = allPnl.filter((d) => inWindow(d.date));
  const equity = (data.derived?.equitySeries ?? []).filter((p) => inWindow(p.date));
  const scores = data.scores.filter((s) => inWindow(s.date));
  const hold = q == null
    ? data.derived?.holdTime ?? { winnersMean: null, losersMean: null, winners: 0, losers: 0 }
    : holdTimeFrom(trips);

  const latest = scores[0] ?? data.scores[0];
  const best = trips.reduce<(typeof trips)[number] | null>(
    (b, t) => (!b || t.pnl > b.pnl ? t : b),
    null,
  );
  const longest = trips.reduce<(typeof trips)[number] | null>(
    (b, t) => (!b || t.holdDays > b.holdDays ? t : b),
    null,
  );

  const cards = buildCards({
    year: yearNum,
    score: latest.score,
    archetype: archetypeOf(latest.components as unknown as Record<string, number>),
    components: latest.components as unknown as Record<string, number>,
    trips,
    holdTime: hold,
    dailyPnl,
    equity,
    scoredDays: scores.length,
    transactionCount: data.transactionCount,
    panicSells: scores.filter((s) =>
      s.contributors.some((c) => c.name.toLowerCase().includes("panic")),
    ).length,
    streakDays: q == null ? currentStreak(data.scores) : longestStreak(scores),
    streakName: "Sessions inside your rules",
    weeklySessions: weeklySessions(dailyPnl),
  });

  // Which windows exist at all: the year, plus each elapsed quarter with a
  // realised day in it.
  const windows = [
    { key: "year", label: String(yearNum), href: "/wrapped", active: q == null },
    ...Array.from({ length: currentQ }, (_, i) => i + 1)
      .filter((n) => allPnl.some((d) => d.date >= qStart(n) && d.date < qEndEx(n)))
      .map((n) => ({
        key: `q${n}`,
        label: `Q${n}`,
        href: `/wrapped?w=q${n}`,
        active: q === n,
      })),
  ];

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
