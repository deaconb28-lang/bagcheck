import type { Insight } from "./types";

/**
 * The copy rules from CLAUDE.md, enforced in code rather than hoped for.
 * The model drafts; this decides whether a draft ships.
 */

const PRESCRIPTIVE = [
  /\byou should\b/i,
  /\byou'?d better\b/i,
  /\byou need to\b/i,
  /\byou (?:must|ought)\b/i,
  /\bconsider\b/i,
  /\btry (?:to|and)\b/i,
  /\bmake sure\b/i,
  /\bbe sure to\b/i,
  /\bremember to\b/i,
  /\bavoid\b/i,
  /\bstart\b.*\bing\b.*\binstead\b/i,
  /\brecommend/i,
  /\bsuggest/i,
];

const COACHING = [
  /\bkeep it up\b/i,
  /\bgreat (?:job|work)\b/i,
  /\bwell done\b/i,
  /\bnice (?:job|work)\b/i,
  /\bproud\b/i,
  /\bimpressive\b/i,
  /\bkeep going\b/i,
  /\byou'?ve got this\b/i,
];

const URGENCY = [
  /\burgent/i,
  /\bimmediately\b/i,
  /\bright now\b/i,
  /\bact fast\b/i,
  /\bdon'?t wait\b/i,
  /\bbefore it'?s too late\b/i,
  /\bhurry\b/i,
];

/** Numbers describe behaviour — never a benchmark, never another person. */
const BENCHMARK = [
  /\bs&p\b/i,
  /\bnasdaq\b/i,
  /\bbenchmark/i,
  /\bmarket average\b/i,
  /\b(?:out|under)perform/i,
  /\bbeat(?:ing)? the\b/i,
  /\bthan (?:most|other) (?:investors|traders|people|users)\b/i,
  /\baverage investor\b/i,
];

/** Never a price alert, never advice. */
const ADVICE = [
  /\bbuy\b(?!\s*(?:side|and hold))/i,
  /\bsell (?:now|today|before)\b/i,
  /\btrim\b/i,
  /\brebalance\b/i,
  /\bprice target\b/i,
  /\bundervalued\b/i,
  /\boverbought\b/i,
];

// Emoji and pictographs — the brand forbids them outright.
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F900}-\u{1F9FF}]/u;

interface Rule {
  name: string;
  patterns: RegExp[];
}

const RULES: Rule[] = [
  { name: "prescriptive", patterns: PRESCRIPTIVE },
  { name: "coaching", patterns: COACHING },
  { name: "urgency", patterns: URGENCY },
  { name: "benchmark", patterns: BENCHMARK },
  { name: "advice", patterns: ADVICE },
];

export interface ValidationResult {
  ok: boolean;
  /** Human-readable reason, suitable for a log line. */
  reason?: string;
}

const MAX_SENTENCE = 120;
const MAX_TAIL = 160;

function checkText(text: string, label: string): string | null {
  if (!text.trim()) return `${label} is empty`;
  if (text.includes("!")) return `${label} contains an exclamation mark`;
  if (EMOJI.test(text)) return `${label} contains an emoji`;
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      const match = text.match(pattern);
      if (match) return `${label} is ${rule.name}: "${match[0]}"`;
    }
  }
  return null;
}

/** Rejects anything that breaks the copy rules or invents a number. */
export function validateInsight(
  insight: Insight,
  allowedNumbers: number[] = [],
): ValidationResult {
  const sentence = insight.sentence?.trim() ?? "";
  const tail = insight.tail?.trim() ?? "";

  if (sentence.length > MAX_SENTENCE) {
    return { ok: false, reason: `sentence is ${sentence.length} chars (max ${MAX_SENTENCE})` };
  }
  if (tail.length > MAX_TAIL) {
    return { ok: false, reason: `tail is ${tail.length} chars (max ${MAX_TAIL})` };
  }

  for (const [text, label] of [
    [sentence, "sentence"],
    [tail, "tail"],
  ] as const) {
    const problem = checkText(text, label);
    if (problem) return { ok: false, reason: problem };
  }

  // Any figure in the copy must trace back to a computed fact.
  const allowed = new Set(allowedNumbers.map((n) => Math.abs(n)));
  for (const raw of `${sentence} ${tail}`.matchAll(/\d+(?:\.\d+)?/g)) {
    const value = Number(raw[0]);
    if (!allowed.has(value)) {
      return { ok: false, reason: `cites ${value}, which is not a computed fact` };
    }
  }

  return { ok: true };
}
