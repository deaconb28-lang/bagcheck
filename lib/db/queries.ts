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

  const merged = new Map<string, HoldingRow>();
  for (const snap of latestPerAccount.values()) {
    for (const position of snap.positions ?? []) {
      const symbol = positionSymbol(position);
      const units = position.units ?? 0;
      if (!units) continue;
      const price = position.price ?? null;
      const avg = position.average_purchase_price ?? null;
      const value = price != null ? price * units : null;
      const cost = avg != null ? avg * units : null;

      const existing = merged.get(symbol);
      if (existing) {
        existing.units += units;
        existing.value = existing.value != null && value != null ? existing.value + value : existing.value ?? value;
        existing.cost = existing.cost != null && cost != null ? existing.cost + cost : existing.cost ?? cost;
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
        });
      }
    }
  }

  const rows = [...merged.values()].map((row) => {
    const pnl = row.value != null && row.cost != null ? row.value - row.cost : null;
    const pnlPct = pnl != null && row.cost ? (pnl / row.cost) * 100 : null;
    return { ...row, pnl, pnlPct };
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

/** The ledger itself, paged — every trade and transfer Bagcheck holds. */
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
