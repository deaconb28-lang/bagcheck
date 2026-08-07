import type { AccountUniversalActivity, Position } from "snaptrade-typescript-sdk";
import type { Contributor, ScoreComponents, StyleBaseline } from "@/lib/score";

export interface ConnectionAccount {
  id: string;
  name: string | null;
  number: string | null;
  institution: string | null;
}

export interface ConnectionDoc {
  userId: string;
  /** The userId registered with SnapTrade (same as our userId). */
  snaptradeUserId: string;
  snaptradeUserSecret: string;
  accounts: ConnectionAccount[];
  createdAt: Date;
  lastSyncAt: Date | null;
  /** Chosen at onboarding (M3+); until then the scorer infers from cadence. */
  styleBaseline?: StyleBaseline;
}

export interface TransactionDoc {
  userId: string;
  /** SnapTrade activity id. */
  externalId: string;
  accountId: string | null;
  /** Trade date, ISO string as reported by the brokerage. */
  date: string | null;
  settledAt: string | null;
  type: string | null;
  symbol: string | null;
  units: number | null;
  price: number | null;
  amount: number | null;
  currency: string | null;
  fee: number | null;
  institution: string | null;
  description: string | null;
  raw: AccountUniversalActivity;
  syncedAt: Date;
}

export interface PositionSnapshotDoc {
  userId: string;
  accountId: string;
  /** YYYY-MM-DD — one snapshot per account per day. */
  date: string;
  takenAt: Date;
  positions: Position[];
}

export interface ScoreDoc {
  userId: string;
  date: string;
  baseline: StyleBaseline;
  score: number;
  components: ScoreComponents;
  contributors: Contributor[];
  computedAt: Date;
}

export interface PulseDoc {
  userId: string;
  date: string;
  questionId: string;
  answer: string;
  answeredAt: Date;
}

export interface TagDoc {
  userId: string;
  date: string;
  transactionId: string;
  why: "thesis" | "momentum" | "saw it online" | "felt cheap" | "revenge";
  conviction: 1 | 2 | 3 | 4 | 5;
}

export interface InsightDoc {
  userId: string;
  date: string;
  kind: string;
  /** The headline sentence. */
  text: string;
  tail?: string;
  /** Whether the model's draft shipped, or the deterministic readout did. */
  source?: "model" | "fallback";
  rejected?: string | null;
  generatedAt?: Date;
}

export interface CardDoc {
  userId: string;
  date: string;
  type: string;
  url: string | null;
}
