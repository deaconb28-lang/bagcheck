import type { Metadata } from "next";
import { getUserId } from "@/auth";
import { getCollections, isDbConfigured, loadScreen, syncClock } from "@/lib/db";
import { buildCards } from "@/lib/cards";
import { TrophyCard } from "@/components/cards/TrophyCard";
import type { Rarity, Trophy } from "@/components/cards/TrophyCard";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { SignInCta } from "@/components/app/SignInCta";
import { can } from "@/lib/tiers";
import type { Capability } from "@/lib/tiers";
import { archetypeOf, currentStreak, weekDelta, weeklySessions } from "../derive";
import screen from "../screen.module.css";
import styles from "./cards.module.css";

export const metadata: Metadata = { title: "Bagcheck — cards" };
export const dynamic = "force-dynamic";

/**
 * Locked *categories*, never locked achievements. Each of these is a format
 * the product would render for you, not a thing your conduct earned.
 *
 * A locked card's badge always renders as "{Tier} category" — TrophyCard
 * overwrites the word regardless of what `rarity` says below — so `rarity`
 * here is repurposed purely to pick the badge's colour via the hue-family
 * pill in TrophyCard.module.css: "rare" reads azure, "scarce" reads ember,
 * the same Plus/Trader pairing the tier chip uses everywhere else.
 */
const CATEGORIES: Array<{ cap: Capability; trophy: Trophy }> = [
  {
    cap: "correlationCard",
    trophy: {
      id: "cat-correlation",
      type: "quarter",
      rarity: "rare", // Plus — azure
      year: "—",
      value: "4.1×",
      title: "Correlation card",
      tail: "Conviction-5 against conviction-2 returns.",
      heldBy: null,
    },
  },
  {
    cap: "setupPerformance",
    trophy: {
      id: "cat-setup",
      type: "quarter",
      rarity: "scarce", // Trader — ember
      year: "—",
      value: "61%",
      title: "Setup performance",
      tail: "Breakouts, across your tagged trades.",
      heldBy: null,
    },
  },
  {
    cap: "motionExport",
    trophy: {
      id: "cat-motion",
      type: "wrapped",
      rarity: "scarce", // Trader — ember
      year: "—",
      value: "MP4",
      title: "Motion card",
      tail: "A score reveal, rendered for Reels.",
      heldBy: null,
    },
  },
];

/*
 * Display rarity for kinds that do not carry `rarity: "rare"` themselves —
 * keyed by the real CardKind ids in lib/cards/kinds.ts. "Scarce" stays
 * reserved for what kinds.ts itself marks rare (noPanic, wrapped), so the
 * word is earned in exactly one place.
 */
const RARITY: Record<string, Rarity> = {
  archetype: "uncommon",
  health: "common",
  longestHold: "rare",
  holdRatio: "uncommon",
  streak: "uncommon",
  bestDecision: "rare",
  drawdownHeld: "rare",
  cadence: "common",
  monthlyPnl: "common",
  equity: "uncommon",
};

export default async function CardsPage() {
  const userId = await getUserId();
  if (!userId || !isDbConfigured()) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · cards"
          icon={userId ? "setup" : "signin"}
          title={userId ? "Configure the ledger store" : "Sign in to open your case"}
          body={
            userId
              ? "Set MONGODB_URI on this deployment to store synced history and scores."
              : "Cards are earned by conduct and minted when you share them."
          }
          actions={[{ label: "Back to the landing page", href: "/", ghost: true }]}
        >
          {userId ? null : <SignInCta />}
        </EmptyState>
      </PageGrid>
    );
  }

  const data = await loadScreen(userId, 400);
  const { cards } = await getCollections();

  const trips = data.derived?.roundTrips ?? [];
  const latest = data.scores[0] ?? null;

  /*
   * The same twelve the Wrapped screen and the mint route build, from the
   * same derived document. There used to be a second, older set of five here
   * with its own thresholds, so this screen and the card someone actually
   * minted could disagree about what they had earned.
   */
  const earned = buildCards({
    year: new Date().getUTCFullYear(),
    score: latest?.score ?? null,
    archetype: archetypeOf((latest?.components as unknown as Record<string, number>) ?? null),
    components: (latest?.components as unknown as Record<string, number>) ?? null,
    trips,
    holdTime: data.derived?.holdTime ?? {
      winnersMean: null,
      losersMean: null,
      winners: 0,
      losers: 0,
    },
    dailyPnl: data.derived?.dailyPnl ?? [],
    equity: data.derived?.equitySeries ?? [],
    scoredDays: data.scores.length,
    transactionCount: data.transactionCount,
    panicSells: data.scores.filter((s) =>
      s.contributors.some((c) => c.name.toLowerCase().includes("panic")),
    ).length,
    streakDays: currentStreak(data.scores),
    streakName: "Sessions inside your rules",
    weeklySessions: weeklySessions(data.derived?.dailyPnl ?? []),
  });

  // Slugs for anything already minted, so an existing card shares its own URL
  // instead of minting a duplicate.
  const minted = await cards
    .find({ userId })
    .sort({ mintedAt: -1 })
    .project<{ type: string; slug: string }>({ _id: 0, type: 1, slug: 1 })
    .toArray();
  const slugFor = new Map<string, string>();
  for (const m of minted) if (!slugFor.has(m.type)) slugFor.set(m.type, m.slug);

  const trophies: Trophy[] = earned.map((spec) => ({
    id: spec.kind,
    slug: slugFor.get(spec.kind),
    type: spec.kind,
    rarity: spec.rarity === "rare" ? "scarce" : (RARITY[spec.kind] ?? "common"),
    year: latest?.date.slice(0, 4) ?? String(new Date().getUTCFullYear()),
    value:
      spec.body.kind === "figure" || spec.body.kind === "chart"
        ? spec.body.value
        : spec.headline,
    title: spec.eyebrow.replace("Bagcheck · ", ""),
    tail: spec.lede,
    heldBy: null,
    symbol: spec.symbol,
  }));

  const lockedCategories = CATEGORIES.filter((c) => !can({ tier: data.tier }, c.cap));
  const scarce = trophies.filter((t) => t.rarity === "scarce").length;

  if (!trophies.length) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · cards"
          icon={data.connection ? "waiting" : "connect"}
          title={data.connection ? "No cards earned yet" : "Connect a brokerage"}
          body="A card is minted from something that actually happened. The first one arrives with your first scored day."
          actions={[{ label: "Open Home", href: "/home" }]}
        />
      </PageGrid>
    );
  }

  return (
    <>
      <ScreenHeader
        title="Cards"
        meta={`${trophies.length} earned · ${scarce} scarce · ${lockedCategories.length} categories locked`}
        score={latest?.score ?? null}
        delta={weekDelta(data.scores)}
        syncedAt={syncClock(data.connection?.lastSyncAt)}
        tier={data.tier}
      />

      <div className={screen.body}>
        <div className={styles.wrap}>
          <section data-reveal className={`${screen.panel} ${styles.statBar}`}>
            {[
              ["Earned", String(trophies.length)],
              ["Scarce", String(scarce)],
              ["Locked categories", String(lockedCategories.length)],
              ["Minted", String(minted.length)],
            ].map(([label, value]) => (
              <div key={label} className={screen.stat}>
                <span className={screen.eyebrow}>{label}</span>
                <span className={`num ${screen.statValue}`}>{value}</span>
              </div>
            ))}
          </section>

          <section data-reveal className={styles.grid} style={{ animationDelay: "0.05s" }}>
            {trophies.map((trophy) => (
              <TrophyCard key={trophy.id} trophy={trophy} />
            ))}
            {lockedCategories.map(({ cap, trophy }) => (
              <TrophyCard key={trophy.id} trophy={trophy} locked capability={cap} />
            ))}
          </section>

          <p data-reveal className={styles.note}>
            Rarity is earned by behaviour, never bought. Paying unlocks
            categories; conduct unlocks the scarce ones — and every card you
            earn posts at full quality on any plan.
          </p>
        </div>
      </div>
    </>
  );
}
