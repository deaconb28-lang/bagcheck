import { NextResponse } from "next/server";
import { getUserId } from "@/auth";
import { getCollections, getDerived, isDbConfigured, loadAppData, mintCard } from "@/lib/db";
import { buildCards } from "@/lib/cards/kinds";
import type { CardSpec } from "@/lib/cards/kinds";
import { generateCardArt } from "@/lib/wrapped";
import { archetypeFor } from "@/lib/archetypes";
import { currentStreak, weeklySessions } from "@/app/(app)/derive";

/*
 * Drawing takes about thirty-five seconds, and the mint waits for it: a card
 * that appears without its picture and grows one later is a card someone
 * screenshots in the wrong state. The cache in `generateCardArt` means only
 * the first person with a given shaped card pays that wait.
 */
export const maxDuration = 60;

/**
 * Mint a card the user has actually earned.
 *
 * The client names a kind; it never supplies the contents. Everything on the
 * card — including the four quantities that shape its artwork — is recomputed
 * here from the ledger, so a crafted request cannot mint a card claiming a
 * number that never happened, nor one whose picture flatters a figure it does
 * not have.
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

  const { transactions, tags } = await getCollections();
  const [{ scores, transactionCount }, derived, taggedCount] = await Promise.all([
    loadAppData(userId, 400),
    getDerived(userId),
    tags.countDocuments({ userId }),
  ]);
  void transactions;
  void taggedCount;

  const latest = scores[0] ?? null;
  const dailyPnl = derived?.dailyPnl ?? [];

  /*
   * The same twelve the screens render, built from the same derived document.
   * There used to be a second, older set of five here with its own thresholds
   * — which meant the card a user was shown and the card they minted could
   * disagree about what they had earned.
   */
  const options = buildCards({
    year: new Date().getUTCFullYear(),
    score: latest?.score ?? null,
    archetype: archetypeFor(latest?.components ?? null),
    components: (latest?.components as unknown as Record<string, number>) ?? null,
    trips: derived?.roundTrips ?? [],
    holdTime: derived?.holdTime ?? {
      winnersMean: null,
      losersMean: null,
      winners: 0,
      losers: 0,
    },
    dailyPnl,
    equity: derived?.equitySeries ?? [],
    scoredDays: scores.length,
    transactionCount,
    panicSells: scores.filter((s) =>
      s.contributors.some((c) => c.name.toLowerCase().includes("panic")),
    ).length,
    streakDays: currentStreak(scores),
    streakName: "Sessions inside your rules",
    weeklySessions: weeklySessions(dailyPnl),
  });

  const spec = kind ? options.find((o) => o.kind === kind) : options[0];
  if (!spec) {
    return NextResponse.json(
      { error: "that card has not been earned yet" },
      { status: 422 },
    );
  }

  /*
   * Art drawn from this card's own numbers — every kind, not just Wrapped,
   * and not one of twelve stock pictures. `spec.art` carries the four
   * measured quantities `lib/wrapped/brief.ts` composes into a prompt, so a
   * 412-day hold and a 34-day hold ask for visibly different mountains.
   *
   * Best-effort and never blocking: a card without art is the flat hue field,
   * which is a complete card.
   */
  const art = await generateCardArt(spec);

  const slug = await mintCard(
    userId,
    stored(spec),
    latest?.date ?? new Date().toISOString().slice(0, 10),
    art,
  );
  return NextResponse.json({ slug, url: `/c/${slug}`, art: Boolean(art) });
}

/**
 * The stored shape, for `/c/[slug]` and the OpenGraph render.
 *
 * A card document is what a *stranger* sees, so it holds only what the public
 * page draws: the label, the figure, the sentence and the tone. The layout,
 * the hue family and the art shape stay behind — they are how the card was
 * made, not what it says.
 */
function stored(spec: CardSpec) {
  const value =
    spec.body.kind === "figure" || spec.body.kind === "chart" ? spec.body.value : spec.headline;
  return {
    kind: spec.kind,
    label: spec.eyebrow,
    value,
    tail: spec.lede,
    // The public card has two tones; the four card hues fold onto them.
    tone: (spec.hue === "azure" || spec.hue === "violet" ? "signal" : "moss") as "moss" | "signal",
    rarity: spec.rarity,
    symbol: spec.symbol,
  };
}
