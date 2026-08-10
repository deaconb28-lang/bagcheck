import { loadScreen, taggedOpensFor } from "@/lib/db";
import { holdTimeFrom } from "@/lib/db/derived";
import { convictionStats } from "@/lib/engine";
import { buildCards } from "@/lib/cards/kinds";
import type { CardSpec } from "@/lib/cards/kinds";
import type { RoundTrip } from "@/lib/score";
import type { ScreenData } from "@/lib/db";
import { archetypeOf, currentStreak, longestStreak, weeklySessions } from "../derive";

export interface WrappedWindow {
  key: string;
  label: string;
  href: string;
  active: boolean;
}

export interface WrappedAssembly {
  data: ScreenData;
  cards: CardSpec[];
  label: string;
  q: number | null;
  yearNum: number;
  windows: WrappedWindow[];
  trips: RoundTrip[];
  hold: { winnersMean: number | null; losersMean: number | null; winners: number; losers: number };
  scores: ScreenData["scores"];
  latest: ScreenData["scores"][number];
}

/**
 * One assembly for every consumer of a Wrapped window — the screen, the
 * story player behind it, and the carousel export. The window slices trips,
 * daily P&L, equity and scores before the same thirteen kinds build, so a
 * screen and its exported ZIP can never disagree about what a quarter held.
 */
export async function assembleWrapped(
  userId: string,
  w: string | undefined,
): Promise<WrappedAssembly | null> {
  const data = await loadScreen(userId, 400);
  if (!data.scores.length) return null;

  const now = new Date();
  const yearNum = now.getUTCFullYear();
  const currentQ = Math.floor(now.getUTCMonth() / 3) + 1;
  const q =
    /^q[1-4]$/.test(w ?? "") && Number((w as string)[1]) <= currentQ
      ? Number((w as string)[1])
      : null;
  const qStart = (n: number) => `${yearNum}-${String((n - 1) * 3 + 1).padStart(2, "0")}-01`;
  const qEndEx = (n: number) => (n === 4 ? `${yearNum + 1}-01-01` : qStart(n + 1));
  const inWindow = (d: string) => (q == null ? true : d >= qStart(q) && d < qEndEx(q));
  const label = q == null ? String(yearNum) : `Q${q} ${yearNum}`;

  const allPnl = data.derived?.dailyPnl ?? [];
  const trips = (data.derived?.roundTrips ?? []).filter((t) => inWindow(t.closeDate));
  const dailyPnl = allPnl.filter((d) => inWindow(d.date));
  const equity = (data.derived?.equitySeries ?? []).filter((p) => inWindow(p.date));
  const scores = data.scores.filter((s) => inWindow(s.date));
  const hold =
    q == null
      ? data.derived?.holdTime ?? { winnersMean: null, losersMean: null, winners: 0, losers: 0 }
      : holdTimeFrom(trips);

  const latest = scores[0] ?? data.scores[0];

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
    conviction: convictionStats(trips, (await taggedOpensFor(userId)).opens),
  });

  const windows: WrappedWindow[] = [
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

  return { data, cards, label, q, yearNum, windows, trips, hold, scores, latest };
}
