import { NextResponse } from "next/server";
import { getUserId } from "@/auth";
import { getCollections, isDbConfigured, loadAppData, mintCard } from "@/lib/db";
import { activeStreaks, buildRoundTrips } from "@/lib/score";
import type { TxnLite } from "@/lib/score";
import { mintable } from "@/lib/cards";

/**
 * Mint a card the user has actually earned.
 *
 * The client names a kind; it never supplies the contents. Everything on the
 * card is recomputed here from the ledger, so a crafted request cannot mint a
 * card claiming a number that never happened.
 */
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "ledger store not configured" }, { status: 503 });
  }

  let kind: string | undefined;
  try {
    kind = (await req.json())?.kind;
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { transactions } = await getCollections();
  const [rows, { scores }] = await Promise.all([
    transactions
      .find({ userId })
      .sort({ date: 1 })
      .project<TxnLite>({ _id: 0, date: 1, type: 1, symbol: 1, units: 1, price: 1, amount: 1 })
      .toArray(),
    loadAppData(userId, 90),
  ]);

  const latest = scores[0] ?? null;
  const trips = buildRoundTrips(rows);
  const panicSells = scores.filter((s) =>
    s.contributors.some((c) => c.name.toLowerCase().includes("panic")),
  ).length;

  const options = mintable({
    score: latest ? { date: latest.date, score: latest.score } : null,
    trips,
    streaks: activeStreaks(scores),
    scoredDays: scores.length,
    panicSells,
  });

  const spec = kind ? options.find((o) => o.kind === kind) : options[0];
  if (!spec) {
    return NextResponse.json(
      { error: "that card has not been earned yet" },
      { status: 422 },
    );
  }

  const slug = await mintCard(userId, spec, latest?.date ?? new Date().toISOString().slice(0, 10));
  return NextResponse.json({ slug, url: `/c/${slug}` });
}
