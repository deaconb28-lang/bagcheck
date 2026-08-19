import type { Position } from "snaptrade-typescript-sdk";
import { getCollections } from "./collections";
import type { ConnectionDoc, PositionSnapshotDoc, ScoreDoc } from "./types";

export interface HoldingRow {
  symbol: string;
  description: string | null;
  units: number;
  price: number | null;
  cost: number | null;
  value: number | null;
  pnl: number | null;
  pnlPct: number | null;
  /**
   * Where the unrealised figure came from.
   *
   * `cost` means we computed it — value less average purchase price times
   * units. `broker` means SnapTrade's own `open_pnl`, which is what shows when
   * the brokerage reports a P&L but not a cost basis. `null` means neither was
   * available and the row states no P&L rather than a zero.
   */
  pnlSource: "cost" | "broker" | null;
}

/** position.symbol is a PositionSymbol wrapping a UniversalSymbol. */
function positionSymbol(position: Position): string {
  return position.symbol?.symbol?.symbol ?? "—";
}

function positionDescription(position: Position): string | null {
  return position.symbol?.description ?? position.symbol?.symbol?.description ?? null;
}

/** Latest snapshot per account, merged into one holdings table. */
export function holdingsFrom(snapshots: PositionSnapshotDoc[]): HoldingRow[] {
  const latestPerAccount = new Map<string, PositionSnapshotDoc>();
  for (const snap of snapshots) {
    const current = latestPerAccount.get(snap.accountId);
    if (!current || snap.date > current.date) {
      latestPerAccount.set(snap.accountId, snap);
    }
  }

  /*
   * The accumulator carries one field the finished row does not: the broker's
   * own P&L, which is summed across accounts here and folded away below. It is
   * an input to the row rather than part of it.
   */
  const merged = new Map<string, HoldingRow & { brokerPnl: number | null }>();
  for (const snap of latestPerAccount.values()) {
    for (const position of snap.positions ?? []) {
      const symbol = positionSymbol(position);
      const units = position.units ?? 0;
      if (!units) continue;
      const price = position.price ?? null;
      const avg = position.average_purchase_price ?? null;
      const value = price != null ? price * units : null;
      const cost = avg != null ? avg * units : null;
      /*
       * The brokerage's own unrealised figure, which SnapTrade returns on the
       * position and which was being stored and thrown away. It is the answer
       * for every broker that reports a P&L but no average purchase price —
       * those holdings showed a dash where a real number was already on file,
       * and it needs no derivation, so it is on the screen the moment a sync
       * has written a snapshot.
       */
      const brokerPnl = position.open_pnl ?? null;

      const existing = merged.get(symbol);
      if (existing) {
        existing.units += units;
        existing.value = existing.value != null && value != null ? existing.value + value : existing.value ?? value;
        existing.cost = existing.cost != null && cost != null ? existing.cost + cost : existing.cost ?? cost;
        /*
         * Summed across accounts like the others. A holding split over two
         * accounts where only one reports `open_pnl` must not report that one
         * account's P&L as the whole position's, so a partial sum is only used
         * where no cost basis exists at all — which the fold below decides.
         */
        existing.brokerPnl =
          existing.brokerPnl != null && brokerPnl != null
            ? existing.brokerPnl + brokerPnl
            : existing.brokerPnl ?? brokerPnl;
      } else {
        merged.set(symbol, {
          symbol,
          description: positionDescription(position),
          units,
          price,
          cost,
          value,
          pnl: null,
          pnlPct: null,
          pnlSource: null,
          brokerPnl,
        });
      }
    }
  }

  const rows = [...merged.values()].map(({ brokerPnl, ...row }) => {
    /*
     * Our own arithmetic first, the broker's second. Cost basis is the figure
     * the rest of this product reasons about, and preferring it keeps one
     * holding's unrealised P&L consistent with the book it sits in; the
     * broker's number fills the gap rather than competing with it.
     */
    const computed = row.value != null && row.cost != null ? row.value - row.cost : null;
    const pnl = computed ?? brokerPnl;
    const pnlSource = computed != null ? "cost" : brokerPnl != null ? "broker" : null;
    /*
     * A percentage needs a base. With only the broker's dollar figure the base
     * is value less that figure — what the position cost, implied — and where
     * even that is unavailable the row states dollars and no percentage rather
     * than dividing by something it does not have.
     */
    const base = row.cost ?? (row.value != null && pnl != null ? row.value - pnl : null);
    const pnlPct = pnl != null && base ? (pnl / base) * 100 : null;
    return { ...row, pnl, pnlPct, pnlSource } as HoldingRow;
  });

  return rows.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
}

export interface AppData {
  connection: ConnectionDoc | null;
  scores: ScoreDoc[];
  snapshots: PositionSnapshotDoc[];
  transactionCount: number;
}

/** One round trip to Mongo for everything the app screens read. */
export async function loadAppData(userId: string, scoreLimit = 30): Promise<AppData> {
  const { connections, scores, positionSnapshots, transactions } = await getCollections();
  const [connection, scoreDocs, snapshots, transactionCount] = await Promise.all([
    connections.findOne({ userId }),
    scores.find({ userId }).sort({ date: -1 }).limit(scoreLimit).toArray(),
    positionSnapshots.find({ userId }).sort({ date: -1 }).limit(20).toArray(),
    transactions.countDocuments({ userId }),
  ]);
  return { connection, scores: scoreDocs, snapshots, transactionCount };
}

export interface ActivityRow {
  externalId: string;
  date: string | null;
  type: string | null;
  symbol: string | null;
  units: number | null;
  price: number | null;
  amount: number | null;
  currency: string | null;
  description: string | null;
}

export interface ActivityPage {
  rows: ActivityRow[];
  total: number;
  /** Counts by normalised kind, across the whole ledger. */
  kinds: Array<{ kind: string; count: number }>;
}

const KIND_OF = (type: string | null): string => {
  const t = (type ?? "").toLowerCase();
  if (t.includes("buy")) return "buy";
  if (t.includes("sell")) return "sell";
  if (t.includes("dividend")) return "dividend";
  if (t.includes("contribution") || t.includes("deposit")) return "deposit";
  if (t.includes("withdraw")) return "withdrawal";
  return "other";
};

/** The ledger itself, paged — every trade and transfer Supercruise holds. */
export async function loadActivity(
  userId: string,
  { limit = 50, skip = 0, kind }: { limit?: number; skip?: number; kind?: string } = {},
): Promise<ActivityPage> {
  const { transactions } = await getCollections();

  // Kind is derived from the broker's free-text type rather than stored, so
  // both the filter and the counts run in memory over one sorted read.
  const docs = await transactions
    .find({ userId })
    .sort({ date: -1 })
    .project<ActivityRow>({
      _id: 0,
      externalId: 1,
      date: 1,
      type: 1,
      symbol: 1,
      units: 1,
      price: 1,
      amount: 1,
      currency: 1,
      description: 1,
    })
    .toArray();

  const counts = new Map<string, number>();
  for (const doc of docs) {
    const k = KIND_OF(doc.type);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  const filtered = kind ? docs.filter((d) => KIND_OF(d.type) === kind) : docs;

  return {
    rows: filtered.slice(skip, skip + limit),
    total: filtered.length,
    kinds: [...counts.entries()]
      .map(([k, count]) => ({ kind: k, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/** Just what the app shell paints — one projected lookup, no history. */
/**
 * Whether this identity has a brokerage actually linked.
 *
 * Not the same question as "is there a connection document". `ensureRegistered`
 * writes one the moment someone opens the portal, so its existence only means
 * they started — an account in `accounts` is what means they finished. The
 * start screen has to tell those apart, or it asks someone who is already
 * linked to link again.
 */
export async function linkedBrokerage(
  userId: string,
): Promise<{ accounts: number; institutions: string[]; lastSyncAt: Date | null } | null> {
  const { connections } = await getCollections();
  const doc = await connections.findOne(
    { userId },
    { projection: { _id: 0, accounts: 1, lastSyncAt: 1 } },
  );
  if (!doc?.accounts?.length) return null;
  const institutions = [
    ...new Set(doc.accounts.map((a) => a.institution).filter((x): x is string => Boolean(x))),
  ];
  return { accounts: doc.accounts.length, institutions, lastSyncAt: doc.lastSyncAt ?? null };
}

export async function loadShellConnection(
  userId: string,
): Promise<{ institution: string | null } | null> {
  const { connections } = await getCollections();
  const doc = await connections.findOne(
    { userId },
    { projection: { _id: 0, accounts: 1 } },
  );
  if (!doc) return null;
  const institution = doc.accounts?.find((a) => a.institution)?.institution ?? null;
  return { institution };
}


/**
 * Uninvested cash across the account, when the brokerage says.
 *
 * Latest snapshot per account, summed — and `null` unless **every** account
 * answered. A partial sum is worse than no figure: an account whose broker
 * reports no balance would silently contribute zero, and the reader would be
 * told they hold less cash than they do on a screen whose whole claim is that
 * its figures came off a brokerage.
 *
 * The same all-or-nothing rule the equity curve's `withCash` basis uses, for
 * the same reason.
 */
export function cashFrom(snapshots: PositionSnapshotDoc[]): number | null {
  const latestPerAccount = new Map<string, PositionSnapshotDoc>();
  for (const snap of snapshots) {
    const current = latestPerAccount.get(snap.accountId);
    if (!current || snap.date > current.date) latestPerAccount.set(snap.accountId, snap);
  }
  if (!latestPerAccount.size) return null;

  let total = 0;
  for (const snap of latestPerAccount.values()) {
    if (typeof snap.cash !== "number") return null;
    total += snap.cash;
  }
  return total;
}
