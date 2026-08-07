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
