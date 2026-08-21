import type { InsightFacts } from "./types";

/**
 * The voice, stated once. Kept stable so it caches, and phrased as
 * constraints rather than a personality sketch.
 */
export const SYSTEM_PROMPT = `You write one-line readouts for Supercruise, which measures how a person invests — their behaviour, not their returns.

You are given computed facts about one person's trading history. You write two lines about those facts.

How the writing works:
- Descriptive, never prescriptive. State what the person did. Never suggest an action, a trade, or a change in approach.
- No exclamation marks, no coaching, no congratulation, no encouragement.
- Never compare the person to a benchmark, an index, or another person.
- Never imply urgency. Nothing is time-sensitive here.
- Plain English at the length of ordinary speech. No jargon, no emoji, no markdown.
- Use only the numbers given to you. Do not calculate new figures or estimate.
- Address the person as "you".

The two lines:
- sentence: what their behaviour did, in at most 100 characters. This is the headline, so it carries the single most interesting fact.
- tail: one supporting line under 140 characters that ships a specific comparison drawn from the facts — a contributor against another, or this reading against the previous one.

Examples of the register, for shape only — do not reuse their content:
- "You held through three straight down weeks."
- "Your cadence has not moved since June."
- "Contributions landed on schedule every week this month."`;

/*
 * Keyed on the stored tone. "gold" and "violet" are the pre-green/blue
 * spellings and still sit on older score documents, so both map through —
 * a miss here would silently drop the phrase from the prompt.
 */
const TONE: Record<string, string> = {
  moss: "held the line",
  gold: "held the line",
  signal: "ran above baseline",
  violet: "ran above baseline",
  clay: "cost you",
};

export function buildUserPrompt(facts: InsightFacts): string {
  const lines: string[] = [
    `Date: ${facts.date}`,
    `Their declared style: ${facts.baseline}`,
    `Health score today: ${facts.score} out of 100`,
  ];

  if (facts.previousScore != null) {
    lines.push(`Previous reading: ${facts.previousScore}`);
  }
  if (facts.weekDelta != null && facts.weekDelta !== 0) {
    lines.push(
      `Change across the scored week: ${facts.weekDelta > 0 ? "up" : "down"} ${Math.abs(facts.weekDelta)}`,
    );
  }

  lines.push(
    "",
    "Score components, each out of 100:",
    `- Adherence: ${facts.components.adherence}`,
    `- Consistency: ${facts.components.consistency}`,
    `- Patience: ${facts.components.patience}`,
    `- Exposure: ${facts.components.exposure}`,
  );

  if (facts.contributors.length) {
    lines.push("", "What moved the score, ranked by impact:");
    for (const contributor of facts.contributors) {
      const direction = contributor.value > 0 ? "added" : "removed";
      lines.push(
        `- ${contributor.name}: ${direction} ${Math.abs(contributor.value)} points (${TONE[contributor.tone] ?? contributor.tone})`,
      );
    }
  } else {
    lines.push("", "Nothing moved the score measurably today.");
  }

  lines.push(
    "",
    `Ledger size: ${facts.transactionCount} transactions across ${facts.accountCount} ${facts.accountCount === 1 ? "account" : "accounts"}.`,
    "",
    "Write the sentence and the tail.",
  );

  return lines.join("\n");
}

/** Every number the copy is allowed to cite. */
export function allowedNumbers(facts: InsightFacts): number[] {
  /*
   * An unmeasured component is not a number the copy may cite, because there
   * is no number: `null` here would let a model write "your patience sits at
   * null" and pass the check on a coincidence.
   */
  const values = [
    facts.score,
    facts.components.adherence,
    facts.components.consistency,
    facts.components.patience,
    facts.components.exposure,
    facts.transactionCount,
    facts.accountCount,
    ...facts.contributors.map((c) => c.value),
  ].filter((n): n is number => n != null);
  if (facts.previousScore != null) values.push(facts.previousScore);
  if (facts.weekDelta != null) values.push(facts.weekDelta);
  return values;
}

export const INSIGHT_SCHEMA = {
  type: "object",
  properties: {
    sentence: {
      type: "string",
      description: "The headline readout, at most 100 characters.",
    },
    tail: {
      type: "string",
      description: "One supporting line under 140 characters, carrying a specific comparison.",
    },
  },
  required: ["sentence", "tail"],
  additionalProperties: false,
} as const;
