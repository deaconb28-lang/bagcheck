import type { EmailContent } from "./render";

/**
 * What the two emails say — pure, so the copy rules can be tested rather than
 * remembered.
 *
 * Both are descriptive readouts of what someone already did. Neither asks a
 * question, suggests an action, or mentions a price. **There is no template
 * here that could become a price alert**: the inputs are scores, counts and
 * hold times, and no function in this file accepts a quote.
 */

export interface BriefInput {
  date: string;
  score: number;
  previousScore: number | null;
  /** The written insight, if one was generated for the day. */
  sentence: string;
  tail: string;
  /** Untagged entries waiting — the one thing a brokerage cannot supply. */
  untagged: number;
  streak: number;
}

export interface RecapInput {
  /** ISO date of the Monday the week began. */
  weekOf: string;
  scoredDays: number;
  score: number;
  weekDelta: number | null;
  /** Realised P&L across the week, in the account's currency. */
  realised: number | null;
  greenSessions: number;
  redSessions: number;
  longestHoldDays: number | null;
  archetype: string;
}

const BASE = process.env.APP_URL || "https://bagcheck.app";

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}`;
const money = (n: number) =>
  `${n >= 0 ? "+" : "−"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

/**
 * The daily brief. One a day, and the only one — the send log makes that
 * structural rather than a habit.
 */
export function dailyBrief(input: BriefInput): EmailContent {
  const blocks = [
    {
      eyebrow: "Health today",
      value: String(input.score),
      tail:
        input.previousScore == null
          ? "Your first reading."
          : `${signed(input.score - input.previousScore)} against yesterday's ${input.previousScore}.`,
    },
  ];

  if (input.streak > 1) {
    blocks.push({
      eyebrow: "Sessions inside your rules",
      value: String(input.streak),
      tail: "Consecutive scored days without a rule break.",
    });
  }

  if (input.untagged > 0) {
    blocks.push({
      eyebrow: "Entries without a reason",
      value: String(input.untagged),
      tail: "Two taps each. Every correlation the engine finds is downstream of these.",
    });
  }

  return {
    subject: `Bagcheck — ${input.score} on ${input.date}`,
    lede: input.sentence || `Your Health score read ${input.score} today.`,
    blocks,
    provenance: `Read from your brokerage · ${input.date}`,
    cta: { label: "Open your score", href: `${BASE}/you` },
  };
}

/** The weekly recap. Behaviour across seven days, never a market summary. */
export function weeklyRecap(input: RecapInput): EmailContent {
  const blocks = [
    {
      eyebrow: "Health, end of week",
      value: String(input.score),
      tail:
        input.weekDelta == null
          ? `${input.scoredDays} scored ${input.scoredDays === 1 ? "day" : "days"} this week.`
          : `${signed(input.weekDelta)} across ${input.scoredDays} scored ${input.scoredDays === 1 ? "day" : "days"}.`,
    },
    {
      eyebrow: "Sessions",
      value: `${input.greenSessions} / ${input.redSessions}`,
      tail:
        input.realised == null
          ? "Green and red sessions. Nothing closed this week."
          : `Green and red, ${money(input.realised)} realised.`,
    },
  ];

  if (input.longestHoldDays != null) {
    blocks.push({
      eyebrow: "Longest hold still open",
      value: String(input.longestHoldDays),
      tail: `Days. You are reading as ${input.archetype} on this week's components.`,
    });
  }

  return {
    subject: `Bagcheck — your week of ${input.weekOf}`,
    lede: `Seven days as ${input.archetype}, read from your own ledger.`,
    blocks,
    provenance: `Week of ${input.weekOf} · read from your brokerage`,
    cta: { label: "Open Wrapped", href: `${BASE}/wrapped` },
  };
}

/**
 * The copy rules, as a function, so both templates and any future one are
 * checked by the same list rather than by review.
 */
export function violations(content: EmailContent): string[] {
  const text = [content.subject, content.lede, content.cta.label, ...content.blocks.flatMap((b) => [b.eyebrow, b.tail])].join(" ");
  const found: string[] = [];
  if (text.includes("!")) found.push("exclamation mark");
  if (/\b(you should|consider|make sure|don't forget|try to|remember to)\b/i.test(text)) {
    found.push("prescriptive phrasing");
  }
  if (/\b(now|today only|hurry|last chance|expires|ends soon|act)\b/i.test(content.subject)) {
    found.push("urgency in the subject");
  }
  if (/\b(price|quote|up \d+%|down \d+%|rally|selloff alert|target)\b/i.test(text)) {
    found.push("market commentary");
  }
  if (/\b(supercharge|unleash|10x|revolutionize|game-changing|seamless|effortless)\b/i.test(text)) {
    found.push("banned word");
  }
  return found;
}
