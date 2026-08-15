import { NextResponse } from "next/server";
import { getUserId } from "@/auth";
import {
  getCollections,
  getDerived,
  isDbConfigured,
  loadAppData,
  mintCard,
  taggedOpensFor,
  tierFor,
} from "@/lib/db";
import { buildCards } from "@/lib/cards/kinds";
import type { CardSpec } from "@/lib/cards/kinds";
import { archetypeFor } from "@/lib/archetypes";
import { convictionStats } from "@/lib/engine";
import { can } from "@/lib/tiers";
import { currentStreak, weeklySessions } from "@/app/(app)/derive";

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
  const [{ scores, transactionCount }, derived, taggedCount, { opens }, tier] =
    await Promise.all([
      loadAppData(userId, 400),
      getDerived(userId),
      tags.countDocuments({ userId }),
      taggedOpensFor(userId),
      tierFor(userId),
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
    conviction: convictionStats(derived?.roundTrips ?? [], opens),
  });

  const spec = kind ? options.find((o) => o.kind === kind) : options[0];
  if (!spec) {
    return NextResponse.json(
      { error: "that card has not been earned yet" },
      { status: 422 },
    );
  }

  /*
   * The correlation card is a Pro *format*: the finding is free on
   * Patterns, the mintable artefact is the paid category. Enforced here
   * because the client only ever names a kind.
   */
  if (spec.kind === "correlation" && !can({ tier }, "correlationCard")) {
    return NextResponse.json(
      { error: "the correlation card is a Pro format" },
      { status: 403 },
    );
  }

  /*
   * No art is generated here, and none is stored on the card.
   *
   * The artwork is twelve fixed images authored once and committed to
   * `public/cards`, and every card of a kind uses its own — the way a Wrapped
   * template is designed once and worn by millions. What makes a card *yours*
   * is composited over it in type: the figure, the sentence, and the company
   * the card is about. Minting is therefore instant and free, rather than a
   * thirty-five second wait and an image bill per person.
   */

  const slug = await mintCard(
    userId,
    stored(spec),
    latest?.date ?? new Date().toISOString().slice(0, 10),
  );
  return NextResponse.json({ slug, url: `/c/${slug}` });
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
