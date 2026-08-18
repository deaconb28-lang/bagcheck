import { getCollections } from "./collections";
import { loadScreen } from "./screen";
import { bookFrom, sectorsFrom } from "@/lib/portfolio/view";
import { cashFrom } from "./queries";

/**
 * The public ledger, and what it is deliberately not.
 *
 * A card is public by a 96-bit slug — unguessable, and shared by the person
 * who minted it. A handle is the opposite access model: it is short, it is
 * chosen, and anybody can type it. So the rules here are stricter than
 * anywhere else in the product, and they are enforced in this function rather
 * than in the page that renders it:
 *
 * **Opt-in twice.** Claiming a handle reserves a name; `publicLedger` decides
 * whether the page answers. Collapsing those would publish somebody the moment
 * they picked a name.
 *
 * **No dollars, ever.** Not a total, not a position size, not a gain. The
 * product is already percent-first for the reader's own screens; for strangers
 * it is percent-only, because a portfolio's *size* is the fact that makes
 * someone a target and it is never the interesting part.
 *
 * **No ledger detail.** No transactions, no dates, no cost basis — a weight, a
 * return and a sector. What somebody holds, not what they did or when.
 *
 * The name is left to the page: it renders the handle, never the account's
 * real name or email.
 */
export interface PublicLedger {
  handle: string;
  /** Return on cost across the whole book, as a percentage. Null if unknowable. */
  returnPct: number | null;
  positions: number;
  winners: number;
  priced: number;
  /** Weight only — never a dollar value. */
  holdings: Array<{ symbol: string; weight: number; pnlPct: number | null }>;
  sectors: Array<{ name: string; share: number }>;
  syncedAt: string | null;
}

/** Lowercase, 3–20, letters digits and underscore. Anything else is not a handle. */
export const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

export function normaliseHandle(raw: string): string | null {
  const handle = raw.trim().replace(/^@/, "").toLowerCase();
  return HANDLE_RE.test(handle) ? handle : null;
}

/**
 * Whether this handle is claimed *and* published — nothing more.
 *
 * The public page shows a reserved name and a coming-soon note rather than a
 * ledger, so loading a whole screen to render none of it is a read nobody
 * needs. One projected lookup answers the only question the page asks.
 *
 * It keeps the property `publicLedgerFor` was built around: an unclaimed
 * handle and an unpublished one are both simply absent, so the route cannot
 * be used as an oracle for which names are taken.
 */
export async function publishedHandle(rawHandle: string): Promise<string | null> {
  const handle = normaliseHandle(rawHandle);
  if (!handle) return null;
  const { prefs } = await getCollections();
  const owner = await prefs.findOne(
    { handle, publicLedger: true },
    { projection: { _id: 0, handle: 1 } },
  );
  return owner?.handle ?? null;
}

export async function publicLedgerFor(rawHandle: string): Promise<PublicLedger | null> {
  const handle = normaliseHandle(rawHandle);
  if (!handle) return null;

  const { prefs } = await getCollections();
  const owner = await prefs.findOne({ handle, publicLedger: true });
  /*
   * A handle nobody claimed and a handle whose owner has not published read
   * the same from outside — both are simply not found. Distinguishing them
   * would turn this route into an oracle for which handles are taken.
   */
  if (!owner) return null;

  const data = await loadScreen(owner.userId, 1);
  const book = bookFrom(data.holdings, cashFrom(data.snapshots));
  if (!book.positions) return null;

  const { sectors } = sectorsFrom(data.holdings, new Map());

  return {
    handle,
    returnPct: book.unrealisedPct,
    positions: book.positions,
    winners: book.winners,
    priced: book.priced,
    holdings: [...data.holdings]
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
      .slice(0, 10)
      .map((row) => ({
        symbol: row.symbol,
        weight: book.value > 0 ? (row.value ?? 0) / book.value : 0,
        pnlPct: row.pnlPct,
      })),
    sectors: sectors.map((s) => ({ name: s.name, share: s.share })),
    syncedAt: data.connection?.lastSyncAt?.toISOString().slice(0, 10) ?? null,
  };
}
