import type { Metadata } from "next";
import { getUserId } from "@/auth";
import { getCollections, isDbConfigured, loadScreen, syncClock } from "@/lib/db";
import { buildRoundTrips, activeStreaks } from "@/lib/score";
import type { TxnLite } from "@/lib/score";
import { mintable } from "@/lib/cards";
import { TrophyCard } from "@/components/cards/TrophyCard";
import type { Rarity, Trophy } from "@/components/cards/TrophyCard";
import { EmptyState } from "@/components/app/EmptyState";
import { PageGrid } from "@/components/app/PageGrid";
import { ScreenHeader } from "@/components/app/ScreenHeader";
import { SignInCta } from "@/components/app/SignInCta";
import { can } from "@/lib/tiers";
import type { Capability } from "@/lib/tiers";
import { weekDelta } from "../derive";
import screen from "../screen.module.css";
import styles from "./cards.module.css";

export const metadata: Metadata = { title: "Bagcheck — cards" };
export const dynamic = "force-dynamic";

/**
 * Locked *categories*, never locked achievements. Each of these is a format
 * the product would render for you, not a thing your conduct earned.
 */
const CATEGORIES: Array<{ cap: Capability; trophy: Trophy }> = [
  {
    cap: "correlationCard",
    trophy: {
      id: "cat-correlation",
      type: "quarter",
      rarity: "common",
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
      rarity: "common",
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
      rarity: "common",
      year: "—",
      value: "MP4",
      title: "Motion card",
      tail: "A score reveal, rendered for Reels.",
      heldBy: null,
    },
  },
];

const RARITY: Record<string, Rarity> = {
  score: "common",
  streak: "uncommon",
  hold: "rare",
  quarter: "scarce",
  wrapped: "rare",
};

export default async function CardsPage() {
  const userId = await getUserId();
  if (!userId || !isDbConfigured()) {
    return (
      <PageGrid>
        <EmptyState
          eyebrow="Bagcheck · cards"
          icon="signin"
          title="Nothing earned yet"
          body={userId ? "The ledger store is not configured." : "Sign in to see your case."}
          actions={[{ label: "Back to the landing page", href: "/", ghost: true }]}
        >
          <SignInCta />
        </EmptyState>
      </PageGrid>
    );
  }

  const data = await loadScreen(userId, 400);
  const { transactions, cards } = await getCollections();

  const rows = await transactions
    .find({ userId })
    .sort({ date: 1 })
    .limit(6000)
    .project<TxnLite>({ _id: 0, date: 1, type: 1, symbol: 1, units: 1, price: 1, amount: 1 })
    .toArray();

  const trips = buildRoundTrips(rows);
  const latest = data.scores[0] ?? null;

  const panicSells = trips.filter((t) => t.holdDays < 1 && t.pnl < 0).length;
  const earned = mintable({
    score: latest ? { date: latest.date, score: latest.score } : null,
    trips,
    streaks: activeStreaks(data.scores),
    scoredDays: data.scores.length,
    panicSells,
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
    value: spec.value,
    title: spec.label.replace("Bagcheck · ", ""),
    tail: spec.tail,
    heldBy: null,
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
          <section data-reveal className={styles.statBar}>
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
