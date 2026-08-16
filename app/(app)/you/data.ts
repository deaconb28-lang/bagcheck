import { getCollections } from "@/lib/db";
import type { ScreenData } from "@/lib/db";
import { isMarketConfigured, refreshHoldings } from "@/lib/market";
import { investmentFlows, inYear, periodReturn, ytdReturn } from "@/lib/returns";
import { wrappedDeck } from "@/lib/wrapped/year";

/**
 * What the four app pages load, in one place.
 *
 * Every query is narrow and projected; the whole set runs in one `Promise.all`
 * because nothing in it depends on anything else in it. Pages compose, this
 * loads, and `lib/dash.ts` does the arithmetic — so a wrong figure has exactly
 * one file to hide in.
 */

export type RangeKey = "45d" | "ytd" | "all";

export const RANGES: Array<{ key: RangeKey; label: string }> = [
  { key: "45d", label: "45D" },
  { key: "ytd", label: "YTD" },
  { key: "all", label: "ALL" },
];

export function rangeOf(raw: string | undefined): RangeKey {
  return raw === "ytd" || raw === "all" ? raw : "45d";
}

const DAY = 86_400_000;

/** The window's opening date, as an ISO day. */
function windowStart(range: RangeKey, year: number, oldest: string | null): string {
  if (range === "ytd") return `${year}-01-01`;
  if (range === "all") return oldest ?? "0000-01-01";
  return new Date(Date.now() - 45 * DAY).toISOString().slice(0, 10);
}

export async function loadDashboard(userId: string, data: ScreenData, range: RangeKey) {
  const today = new Date().toISOString().slice(0, 10);
  const year = new Date().getUTCFullYear();

  const snapshotDate = data.snapshots.reduce<string | null>(
    (newest, snapshot) => (!newest || snapshot.date > newest ? snapshot.date : newest),
    null,
  );

  const { rows: holdings, provenance } = isMarketConfigured()
    ? await refreshHoldings(data.holdings, snapshotDate, today)
    : { rows: data.holdings, provenance: `Brokerage synced ${snapshotDate ?? "never"}` };

  const { transactions } = await getCollections();
  const [flowRows, wrapped] = await Promise.all([
    transactions
      .find({ userId, type: { $regex: /buy|sell/i } })
      .project<{ date: string; type: string; amount: number | null }>({
        _id: 0,
        date: 1,
        type: 1,
        amount: 1,
      })
      .toArray(),
    wrappedDeck(userId, year).catch(() => null),
  ]);

  /*
   * The materialised curve, carrying `interpolated` because the return
   * arithmetic needs it: a forward-filled opening mark cannot contain a trade
   * dated that day and a real snapshot already does.
   */
  const fullCurve = (data.derived?.equitySeries ?? []).map((point) => ({
    date: point.date,
    value: point.value,
    interpolated: point.interpolated,
  }));

  const from = windowStart(range, year, fullCurve[0]?.date ?? null);
  const curve = fullCurve.filter((point) => point.date >= from);

  const totalValue = holdings.reduce((sum, holding) => sum + (holding.value ?? 0), 0);
  const totalCost = holdings.reduce((sum, holding) => sum + (holding.cost ?? 0), 0);

  /*
   * The reader's own year, on the terms the fund field is quoted on, and only
   * when the window matches: a six-month figure drawn beside a twelve-month
   * one is two measurements at one scale rather than a comparison.
   */
  const flows = investmentFlows(flowRows);
  const yearCurve = inYear(fullCurve, year);
  const opened = yearCurve[0]?.date ?? null;
  const sameWindow = opened != null && opened <= `${year}-01-14`;

  const ytd =
    range === "ytd" || range === "all"
      ? range === "all"
        ? periodReturn(fullCurve, flows)
        : ytdReturn(fullCurve, flows, year)
      : periodReturn(curve, flows);

  /* Two names carrying most of the book is the one thing worth saying here. */
  const byValue = [...holdings].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  const topTwo = byValue.slice(0, 2).reduce((sum, holding) => sum + (holding.value ?? 0), 0);
  const topShare = totalValue > 0 ? topTwo / totalValue : 0;
  const concentration =
    byValue.length >= 2 && topShare >= 0.45
      ? `${byValue[0].symbol} and ${byValue[1].symbol} carry ${Math.round(topShare * 100)}% of your book.`
      : null;

  return {
    today,
    year,
    from,
    range,
    label: RANGES.find((option) => option.key === range)?.label ?? "45D",
    holdings,
    provenance,
    totalValue,
    totalCost,
    curve,
    fullCurve,
    flowRows,
    ytd,
    sameWindow,
    concentration,
    topShare,
    findings: data.derived?.findings ?? [],
    earned: wrapped?.cards.length ?? 0,
    wrapped,
    axis: axisLabels(curve),
  };
}

/** Six dates spread across the window, formatted the way a chart says them. */
function axisLabels(curve: Array<{ date: string }>): string[] {
  if (curve.length < 2) return [];
  const picks = [0, 0.2, 0.4, 0.6, 0.8, 1].map((f) =>
    curve[Math.min(Math.round(f * (curve.length - 1)), curve.length - 1)],
  );
  return picks.map((point) => {
    const at = new Date(`${point.date}T00:00:00Z`);
    return Number.isNaN(at.getTime())
      ? point.date
      : at.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  });
}
