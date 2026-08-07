import type { InsightFacts, InsightResult } from "./types";

/**
 * The deterministic readout. This is what ships when the API key is absent,
 * the call fails, or the draft breaks a copy rule — so it has to be correct
 * and on-voice on its own, not a placeholder.
 */
export function fallbackInsight(facts: InsightFacts, rejected?: string): InsightResult {
  const top = facts.contributors[0];
  const second = facts.contributors[1];

  if (!top) {
    return {
      sentence: "Not enough history yet to describe your week.",
      tail: `Your ledger holds ${facts.transactionCount} transactions so far.`,
      source: "fallback",
      rejected,
    };
  }

  const sentence =
    facts.previousScore != null && facts.score !== facts.previousScore
      ? `${top.name}. Your score moved ${facts.score > facts.previousScore ? "up" : "down"} ${Math.abs(facts.score - facts.previousScore)}.`
      : `${top.name}.`;

  const tail = second
    ? `${top.name} moved it ${Math.abs(top.value)}; ${second.name.toLowerCase()} moved it ${Math.abs(second.value)}.`
    : `That accounts for ${Math.abs(top.value)} of today's reading.`;

  return { sentence, tail, source: "fallback", rejected };
}
