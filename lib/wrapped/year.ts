import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getCollections } from "@/lib/db/collections";
import { getDerived } from "@/lib/db/derived";
import { loadScreen } from "@/lib/db/screen";
import type { ScreenData } from "@/lib/db/screen";
import { archetypeFor } from "@/lib/archetypes";
import { indexReturnYtd, isMarketConfigured, profilesFor } from "@/lib/market";
import { CARDS } from "../../wrapped/cards.mjs";
import { cardDocument } from "./document";
import { fallbackCaption, fill } from "./personalise";
import { sampleWrapped } from "./sample";
import { earnedCards, wrappedStats } from "./stats";
import { yearWindow } from "./window";
import type { WrappedWindow } from "./window";
import type { WrappedContext, WrappedStats } from "./stats";
import { finishCards } from "./run";
import type { CardJob, FinishedCard } from "./run";

/**
 * The slice of a card definition this file needs, named once.
 *
 * `wrapped/cards.mjs` is plain JavaScript with a JSDoc typedef, so every
 * consumer states the shape it reads. Stating it twice in one file is how the
 * two calls below drifted apart the first time a field was added.
 */
type CardDef = {
  no: string;
  key: string;
  title: string;
  measures: string | null;
  tokens: string[];
  fallbackCaptions: string[];
};

/**
 * One reader's year, from the ledger to twelve finished cards.
 *
 * This is the whole of Phase 3's assembly: read what the derived layer already
 * holds, compute the stats deterministically, drop the cards this account has
 * not earned, and hand what remains to the model for a caption each.
 *
 * Nothing here decides what a card *says* — `stats.ts` did that, before the
 * network was involved.
 */

export interface WrappedYear {
  year: number;
  stats: WrappedStats;
  context: WrappedContext;
  cards: FinishedCard[];
  /** The fingerprint the cache is keyed on. Same stats, same cards. */
  fingerprint: string;
}

/** Templates are read from disk once per process, not once per card. */
const templates = new Map<string, string>();

/*
 * Addressed from the working directory, not from `import.meta.url`. Next
 * compiles server code into `.next/server/chunks`, so a path relative to the
 * module resolves to `.next/wrapped/templates` at runtime and finds nothing —
 * it only appears to work under `tsx`, where the module really is where it
 * looks. `next start` runs at the project root, which is the same assumption
 * `app/og/[slug]/render.tsx` already makes when it reads a font off disk.
 */
async function template(no: string): Promise<string> {
  const hit = templates.get(no);
  if (hit) return hit;
  const html = await readFile(join(process.cwd(), "wrapped/templates", `card-${no}.html`), "utf8");
  templates.set(no, html);
  return html;
}

/**
 * A stable fingerprint of everything a card is made of.
 *
 * The cards are regenerated only when this moves, which is what stops a page
 * view from spending twelve model calls. It is the stats themselves rather
 * than a sync timestamp: a sync that changed nothing a card states should not
 * invalidate the cards, and the ledger moves far more often than the year's
 * headline figures do.
 */
/**
 * Bumped when the *deck* changes rather than the reader's figures — an order,
 * a card's identity, a token list. Without it a cached document keeps serving
 * the numbering it was built under: the stats have not moved, so the
 * fingerprint has not moved, so nothing rebuilds and card 08 stays whatever it
 * used to be. One constant, and every deck rebuilds once.
 */
const DECK_VERSION = "2";

export function fingerprintOf(stats: WrappedStats): string {
  return `v${DECK_VERSION}|` + Object.entries(stats)
    .filter(([, v]) => typeof v === "string" && v)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("|");
}

/** The reader's display name, which card 01 puts on the cover. */
async function displayName(userId: string): Promise<string | null> {
  try {
    const { users } = (await getCollections()) as unknown as {
      users?: { findOne: (q: unknown) => Promise<{ name?: string } | null> };
    };
    /*
     * By ObjectId, not by the string.
     *
     * The Auth.js adapter keys its own collections by the user's ObjectId —
     * `lib/db/account.ts` says so, and converts, for exactly this reason. This
     * looked the name up with the plain string, which matches nothing, so
     * `USER_NAME` was null for every account that has ever existed. The cover
     * is the one card every connected reader should own and it requires that
     * token, so it never earned — which is most of why a real account arrives
     * at "Nothing has been earned yet".
     */
    const { ObjectId } = await import("mongodb");
    let oid: InstanceType<typeof ObjectId> | null = null;
    try {
      oid = new ObjectId(userId);
    } catch {
      oid = null;
    }
    const doc = oid ? await users?.findOne({ _id: oid }) : null;
    return doc?.name?.split(/\s+/)[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Compute the stats for a year. No model, no network beyond the benchmark —
 * the part of the pipeline that has to be right.
 */
export async function statsForYear(
  userId: string,
  year: number,
  name?: string | null,
  window: WrappedWindow = yearWindow(year),
  /*
   * The screen, when the caller already holds one.
   *
   * `loadScreen` is not memoised, so a page that has read the ledger and then
   * asks for its deck reads it a second time in the same navigation — which is
   * the failure this repository already fixed once for the share-card
   * assembly. The dashboard is that caller again: it draws the cards now, and
   * it defaults to the same 400 scores this needs, so a screen handed over
   * here is an identical document rather than a smaller one.
   */
  screen?: ScreenData,
): Promise<{ stats: WrappedStats; context: WrappedContext } | null> {
  const [data, derived] = await Promise.all([
    screen ? Promise.resolve(screen) : loadScreen(userId, 400),
    getDerived(userId),
  ]);
  if (!derived) return null;

  const { transactions } = await getCollections();
  const rows = await transactions
    /*
     * The window's own range. `to` is exclusive, so `$lt` — a quarter ends
     * where the next begins and `$lte` on the next quarter's first day would
     * pull one day of its trades into this one.
     */
    .find({ userId, date: { $gte: window.from, $lt: window.to } })
    .project<{ date: string; type: string; symbol: string | null; amount: number | null }>({
      _id: 0,
      date: 1,
      type: 1,
      symbol: 1,
      amount: 1,
    })
    .toArray();

  /*
   * Sectors come from the market layer's company profiles, which the app
   * already fetches and caches for names. Without a key there is no sector and
   * card 09 is unearned — an inferred sector is a lookup table pretending to
   * be a fact about the reader's book.
   */
  const symbols = data.holdings.map((h) => h.symbol).filter(Boolean);
  const [profiles, indexReturn] = await Promise.all([
    isMarketConfigured() ? profilesFor(symbols).catch(() => new Map()) : Promise.resolve(new Map()),
    /*
     * The benchmark is a *year to date* figure and there is no quarterly one in
     * this repository. A YTD index return set beside a quarter's own return
     * would be two different measurements printed as a comparison, which is the
     * exact thing the field block refuses to do — so on a quarter the index is
     * absent and card 10 is simply unearned.
     */
    isMarketConfigured() && window.quarter == null
      ? indexReturnYtd().catch(() => null)
      : Promise.resolve(null),
  ]);

  const latest = data.scores[0] ?? null;
  const archetype = latest ? archetypeFor(latest.components) : null;

  return wrappedStats({
    year,
    window: { from: window.from, to: window.to, label: window.label },
    name: name ?? (await displayName(userId)),
    equity: derived.equitySeries.map((p) => ({ date: p.date, value: p.value })),
    trips: derived.roundTrips,
    rows: rows.map((r) => ({
      date: r.date ?? "",
      type: r.type ?? "",
      symbol: r.symbol ?? null,
      amount: r.amount ?? null,
    })),
    dailyPnl: derived.dailyPnl,
    holdings: data.holdings.map((h) => ({
      symbol: h.symbol,
      value: h.value ?? null,
      sector: profiles.get(h.symbol)?.industry ?? null,
    })),
    archetype: archetype ? { name: archetype.name, trait: archetype.line } : null,
    investorAge: data.investorAge,
    indexReturn,
    /* Percent-first: dollars only when the reader has turned them on. */
    showDollars: false,
  });
}

/**
 * The finished set, cached per reader per year.
 *
 * Twelve model calls is cheap but it is not free, and a reader who opens their
 * year twice in a day should pay for it once. The cache is keyed on the stats
 * fingerprint, so it survives a sync that did not move any figure a card
 * states and invalidates itself the moment one does.
 */
export async function wrappedYear(
  userId: string,
  year: number,
  opts: { refresh?: boolean; name?: string | null; window?: WrappedWindow; screen?: ScreenData } = {},
): Promise<WrappedYear | null> {
  const window = opts.window ?? yearWindow(year);
  const computed = await statsForYear(userId, year, opts.name, window, opts.screen);
  if (!computed) return null;

  const { stats, context } = computed;
  const fingerprint = fingerprintOf(stats);
  const earned = earnedCards(CARDS as CardDef[], stats);
  if (!earned.length) return { year, stats, context, cards: [], fingerprint };

  const { wrappedCards } = await getCollections();

  if (!opts.refresh) {
    const hit = await wrappedCards.findOne({ userId, year, window: window.key });
    if (hit && hit.fingerprint === fingerprint) {
      return { year, stats, context, cards: hit.cards, fingerprint };
    }
  }

  const jobs: CardJob[] = await Promise.all(
    earned.map(async (c) => ({
      no: c.no,
      key: c.key,
      title: c.title,
      measures: c.measures ?? null,
      template: await template(c.no),
      fallbackCaptions: c.fallbackCaptions,
    })),
  );
  const tokensByCard = Object.fromEntries(earned.map((c) => [c.no, c.tokens]));

  const cards = await finishCards(jobs, tokensByCard, stats, context, `${userId}:${year}`);

  await wrappedCards
    .updateOne(
      { userId, year, window: window.key },
      { $set: { userId, year, window: window.key, fingerprint, cards, builtAt: new Date() } },
      { upsert: true },
    )
    .catch((err) => console.error("[wrapped] cache write failed", err));

  return { year, stats, context, cards, fingerprint };
}

/** One card as a page: the stored markup plus the stylesheet and the fit. */
export interface ShownCard {
  no: string;
  key: string;
  caption: string;
  /** A complete document, ready for a frame. */
  html: string;
}

/**
 * The deck a screen actually renders — a reader's year, or the sample.
 *
 * One function for both, because they must not diverge: the sample exists to
 * show what the product does, and a demo built by a different path would drift
 * from the thing it advertises within a release or two. The only difference is
 * where the stats came from and what the provenance line says.
 *
 * The sample takes the deterministic caption bank rather than the model. It is
 * the same deck for every visitor, so writing it twelve times a minute would
 * be spending money to produce the same page.
 */
export async function wrappedDeck(
  userId: string | null,
  year: number,
  opts: {
    example?: boolean;
    name?: string | null;
    window?: WrappedWindow;
    /** A screen the caller already read. See `statsForYear`. */
    screen?: ScreenData;
  } = {},
): Promise<{ cards: ShownCard[]; example: boolean; stats: WrappedStats | null }> {
  const real =
    !opts.example && userId
      ? await wrappedYear(userId, year, { name: opts.name, window: opts.window, screen: opts.screen })
      : null;

  if (real?.cards.length) {
    const cards = await Promise.all(
      real.cards.map(async (c) => ({
        no: c.no,
        key: c.key,
        caption: c.caption,
        html: await cardDocument(c.html),
      })),
    );
    return { cards, example: false, stats: real.stats };
  }

  const { stats } = sampleWrapped(year);
  const earned = earnedCards(
    CARDS as CardDef[],
    stats,
  );
  const cards = await Promise.all(
    earned.map(async (c) => {
      const caption = fallbackCaption(c.fallbackCaptions, `sample:${c.no}`);
      const filled = fill(await template(c.no), stats, caption);
      return { no: c.no, key: c.key, caption, html: await cardDocument(filled, { example: true }) };
    }),
  );
  return { cards, example: true, stats };
}
