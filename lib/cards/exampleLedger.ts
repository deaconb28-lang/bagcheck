import { archetypeByKey } from "@/lib/archetypes";
import type { CardInput } from "@/lib/cards/kinds";

/**
 * One example ledger, and the only fabricated data on the marketing page.
 *
 * It exists so the cards on the landing page are produced by `buildCards` —
 * the same twelve kinds, the same sample floors, the same rarity rules the
 * app runs. A hand-written mock would drift from the product within a week,
 * and the whole argument of that section is that these numbers come from a
 * brokerage rather than from a designer.
 *
 * Every card built from it renders with `example` set, which puts the word on
 * the card's face. Nothing here is anyone's record.
 */

const SEEDED = (n: number, phase: number) =>
  Math.sin(n * 0.62 + phase) * 1.4 + Math.cos(n * 0.29 + phase);

export function exampleLedger(year: number): CardInput {
  const equity = Array.from({ length: 260 }, (_, i) => ({
    date: `2026-${String(1 + Math.floor(i / 22)).padStart(2, "0")}-01`,
    value: 48000 + i * 62 + SEEDED(i, 0) * 2600,
  }));

  return {
    year,
    score: 82,
    archetype: archetypeByKey("sentinel")!,
    components: { adherence: 78, consistency: 54, patience: 84, exposure: 51 },
    trips: [
      { symbol: "ASML", openDate: "2025-06-19", closeDate: "2026-08-04", holdDays: 412, pnl: 6120, notional: 0 },
      { symbol: "COST", openDate: "2025-11-02", closeDate: "2026-05-14", holdDays: 193, pnl: 2410, notional: 0 },
      { symbol: "NVDA", openDate: "2026-01-08", closeDate: "2026-02-20", holdDays: 43, pnl: -880, notional: 0 },
    ],
    holdTime: { winnersMean: 186, losersMean: 61, winners: 19, losers: 11 },
    dailyPnl: Array.from({ length: 250 }, (_, i) => ({
      date: `2026-${String(1 + Math.floor(i / 21)).padStart(2, "0")}-${String((i % 21) + 1).padStart(2, "0")}`,
      realised: Math.round(SEEDED(i, 1.2) * 210),
    })),
    equity,
    scoredDays: 214,
    transactionCount: 2847,
    panicSells: 0,
    streakDays: 41,
    streakName: "Sessions inside your exposure band",
    conviction: { highMean: 8.2, lowMean: 2.0, highN: 21, lowN: 14 },
    weeklySessions: [3, 4, 3, 5, 4, 3, 4, 4, 2, 5, 4, 3],
  };
}
