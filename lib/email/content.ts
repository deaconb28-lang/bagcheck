import type { EmailBlock, EmailContent } from "./render";

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
  /**
   * The date the previous score was read on.
   *
   * The tail used to say "against yesterday's 71", which was true while this
   * went out every morning and became false the moment it went out on
   * Mondays only — the reading it is compared against is Friday's. A brief
   * that misnames the day it is comparing to is a figure nobody can check.
   */
  previousDate: string | null;
  /** The written insight, if one was generated for the day. */
  sentence: string;
  tail: string;
  /** Untagged entries waiting — the one thing a brokerage cannot supply. */
  untagged: number;
  streak: number;
  /**
   * Named in the foot row, and null until every component is measured.
   *
   * `archetypeFor` returns null on an account that has not been scored on all
   * four, and a confident character beside somebody's name is the loudest
   * claim this product makes — so it is absent rather than blank.
   */
  archetype: string | null;
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
  /** Null when the four components are not all measured yet. */
  archetype: string | null;
}

const BASE = process.env.APP_URL || "https://supercruise.app";

const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}`;

const days = (n: number) => `${n} scored ${n === 1 ? "day" : "days"}`;

/** "Friday", from an ISO date, in UTC — the clock everything else here uses. */
const weekdayOf = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
const money = (n: number) =>
  `${n >= 0 ? "+" : "−"}$${Math.abs(Math.round(n)).toLocaleString("en-US")}`;

/**
 * The daily brief. One a day, and the only one — the send log makes that
 * structural rather than a habit.
 */
export function dailyBrief(input: BriefInput): EmailContent {
  /*
   * The row at the foot states only what the prose has not.
   *
   * The score, its delta and the untagged count are all said in words above
   * it — printing any of them again is the same measurement pretending to be
   * two, which is the rule the dashboard already lives by.
   */
  const blocks: EmailBlock[] = [];
  /*
   * No streak here: the headline already says it, in words, which is the
   * better place for it. Two of the same figure in one message is the thing
   * this row exists to avoid.
   */
  if (input.archetype) {
    blocks.push({ eyebrow: "Reading as", value: input.archetype, tone: "count" });
  }

  /*
   * No score line. The hero already states the figure and its comparison, and
   * a paragraph that says "your score read 74, three above Friday's 71" under
   * a 118px 74 is the same sentence twice at two sizes. The exception is a
   * first reading, where there is no comparison to show and the fact that it
   * is the first is worth saying.
   */
  const paragraphs =
    input.previousScore == null ? [`This is your first reading.`] : [];
  /* The insight's second line: what the sentence above it accounts for. */
  if (input.tail) paragraphs.push(input.tail);
  if (input.untagged > 0) {
    paragraphs.push(
      `${input.untagged} ${input.untagged === 1 ? "entry is" : "entries are"} still without a reason. Two taps each, and every pattern the engine finds is downstream of them.`,
    );
  }

  return {
    subject: `Supercruise — ${input.score} to start the week`,
    eyebrow: "Monday brief",
    hero: {
      value: String(input.score),
      delta: input.previousScore == null ? undefined : signed(input.score - input.previousScore),
      deltaUp: input.previousScore == null || input.score >= input.previousScore,
      tail:
        input.previousScore == null
          ? undefined
          : `against ${input.previousDate ? `${weekdayOf(input.previousDate)}'s` : "your last"} ${input.previousScore}`,
    },
    headline:
      input.streak > 1
        ? `${input.streak} sessions inside your rules.`
        : "Where you stand going in.",
    lede: input.sentence || `Your score read ${input.score} today.`,
    paragraphs,
    blocks,
    provenance: input.date,
    cta: { label: "Open your week", href: `${BASE}/you` },
  };
}

/** The weekly recap. Behaviour across the week, never a market summary. */
export function weeklyRecap(input: RecapInput): EmailContent {
  /* Again: only what the prose has not already said. */
  const blocks: EmailBlock[] = [];
  if (input.realised != null) {
    blocks.push({ eyebrow: "Realised", value: money(input.realised), tone: input.realised >= 0 ? "moss" : "loss" });
  }
  /*
   * Realised P&L is the only figure this week has that the prose does not
   * already say — the score, the delta, the scored days, the sessions and the
   * longest hold are all in words above. A row that restated one of them
   * would be padding.
   */

  /* Same rule: the hero carries the close and the delta, so the prose does not. */
  const paragraphs: string[] = [];
  if (input.longestHoldDays != null) {
    paragraphs.push(
      `The longest position still open has been held ${input.longestHoldDays} ${input.longestHoldDays === 1 ? "day" : "days"}.`,
    );
  }

  return {
    subject: `Supercruise — your week of ${input.weekOf}`,
    eyebrow: "Friday recap",
    hero: {
      value: String(input.score),
      delta: input.weekDelta == null ? undefined : signed(input.weekDelta),
      deltaUp: input.weekDelta == null || input.weekDelta >= 0,
      tail: input.weekDelta == null ? undefined : `across ${days(input.scoredDays)}`,
    },
    headline: `${input.greenSessions} green ${input.greenSessions === 1 ? "session" : "sessions"} to ${input.redSessions} red.`,
    /* The hero's tail already counts the days; this names who they read as. */
    lede: input.archetype
      ? `As ${input.archetype}, read from your own ledger.`
      : "Read from your own ledger.",
    paragraphs,
    blocks,
    provenance: `Week of ${input.weekOf}`,
    cta: { label: "Open your week", href: `${BASE}/wrapped` },
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
