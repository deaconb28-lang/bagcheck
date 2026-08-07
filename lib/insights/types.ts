import type { Contributor, ScoreComponents, StyleBaseline } from "@/lib/score";

/** Everything the writer is allowed to know. Computed, never guessed. */
export interface InsightFacts {
  date: string;
  baseline: StyleBaseline;
  score: number;
  previousScore: number | null;
  weekDelta: number | null;
  components: ScoreComponents;
  contributors: Contributor[];
  transactionCount: number;
  accountCount: number;
}

export interface Insight {
  /** The headline sentence on Today. Plain English, describes behaviour. */
  sentence: string;
  /** One supporting line carrying a specific comparison. */
  tail: string;
}

export type InsightSource = "model" | "fallback";

export interface InsightResult extends Insight {
  source: InsightSource;
  /** Why the model output was rejected, when it was. */
  rejected?: string;
}
