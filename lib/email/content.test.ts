import assert from "node:assert/strict";
import { test } from "node:test";
import { dailyBrief, violations, weeklyRecap } from "./content";
import { renderHtml, renderText } from "./render";

const brief = {
  date: "2026-08-08",
  score: 82,
  previousScore: 79,
    previousDate: "2026-08-21",
  sentence: "You held through three straight down weeks.",
  tail: "Patience carried the reading, not exposure.",
  untagged: 4,
  streak: 11,
  archetype: "The Sentinel",
};

const recap = {
  weekOf: "2026-08-03",
  scoredDays: 5,
  score: 82,
  weekDelta: 3,
  realised: 1240,
  greenSessions: 3,
  redSessions: 2,
  longestHoldDays: 412,
  archetype: "The Sentinel",
};

test("the brief leads with the written insight, not a template line", () => {
  const content = dailyBrief(brief);
  assert.equal(content.lede, brief.sentence);
  assert.equal(content.hero?.value, "82");
});

test("the comparison names the day it is comparing to", () => {
  /*
   * The brief goes out on Mondays, so the reading it is measured against is
   * Friday's. It used to say "yesterday", which was true on a daily cadence
   * and became a figure nobody could check the moment the cadence changed.
   */
  assert.equal(dailyBrief({ ...brief, previousDate: "2026-08-21" }).hero?.tail, "against Friday's 79");
  assert.equal(dailyBrief({ ...brief, previousDate: "2026-08-19" }).hero?.tail, "against Wednesday's 79");
  /* And the prose does not say it a second time under the figure. */
  assert.ok(!(dailyBrief(brief).paragraphs ?? []).some((p) => p.includes("79")));
});

test("a comparison with no date on file names no day", () => {
  assert.equal(dailyBrief({ ...brief, previousDate: null }).hero?.tail, "against your last 79");
});

test("the recap counts the week rather than calling it seven days", () => {
  /*
   * It goes out on a Friday evening over a week the market has just closed —
   * five trading days, fewer on a quiet ledger. "Seven days" was wrong on
   * most weeks and contradicted the block three lines below it.
   */
  assert.equal(weeklyRecap(recap).hero?.tail, "across 5 scored days");
  assert.equal(weeklyRecap({ ...recap, scoredDays: 1 }).hero?.tail, "across 1 scored day");
  /* And the count is stated once: the lede names the character, not the days. */
  assert.ok(!weeklyRecap(recap).lede.includes("5"));
});

test("the row never repeats a figure the prose has already stated", () => {
  /*
   * The letter says the score, its delta and the untagged count in words.
   * Printing any of them again in the row underneath is the same measurement
   * pretending to be two — the rule the dashboard already lives by.
   */
  const content = dailyBrief(brief);
  const prose = [content.headline, content.lede, ...(content.paragraphs ?? [])].join(" ");
  for (const block of content.blocks) {
    assert.ok(!prose.includes(block.value), `${block.eyebrow} is already said in the prose`);
  }
  const week = weeklyRecap(recap);
  const weekProse = [week.headline, week.lede, ...(week.paragraphs ?? [])].join(" ");
  for (const block of week.blocks) {
    assert.ok(!weekProse.includes(block.value), `${block.eyebrow} is already said in the prose`);
  }
});

test("a figure is coloured by what it measures, never by default", () => {
  /*
   * Moss is money up and nothing else. Every block used to render moss — a
   * score, a streak, a count of untagged entries — which told a reader that
   * three different measurements were all gains.
   */
  for (const block of dailyBrief(brief).blocks) {
    assert.equal(block.tone, "count", `${block.eyebrow} is a tally, not money`);
  }
  for (const block of weeklyRecap(recap).blocks) {
    if (block.eyebrow !== "Realised") {
      assert.notEqual(block.tone, "moss", `${block.eyebrow} is not money up`);
    }
  }
  assert.equal(
    weeklyRecap(recap).blocks.find((b) => b.eyebrow === "Realised")?.tone,
    "moss",
    "realised P&L is the one figure here that is money",
  );
});

test("a first reading does not claim a comparison it does not have", () => {
  const content = dailyBrief({ ...brief, previousScore: null });
  assert.equal(content.hero?.delta, undefined);
  assert.equal(content.hero?.tail, undefined);
  assert.match(content.paragraphs?.[0] ?? "", /first reading/);
});

test("the brief falls back to a factual lede when nothing was written", () => {
  const content = dailyBrief({ ...brief, sentence: "" });
  assert.equal(content.lede, "Your score read 82 today.");
});

test("a character is absent rather than blank until it is earned", () => {
  /*
   * `archetypeFor` returns null until all four components are measured, and
   * a confident character beside somebody's name is the loudest claim this
   * product makes.
   */
  const content = dailyBrief({ ...brief, archetype: null });
  assert.ok(!content.blocks.some((b) => b.eyebrow === "Reading as"));
  assert.equal(weeklyRecap({ ...recap, archetype: null }).lede, "Read from your own ledger.");
});

test("a streak is stated once, in the headline, or not at all", () => {
  assert.equal(dailyBrief(brief).headline, "11 sessions inside your rules.");
  assert.equal(dailyBrief({ ...brief, streak: 1 }).headline, "Where you stand going in.");
  assert.ok(
    !dailyBrief(brief).blocks.some((b) => b.eyebrow === "Streak"),
    "the row does not say it a second time",
  );
});

test("the recap describes behaviour across the week, never the market", () => {
  const content = weeklyRecap(recap);
  assert.ok(content.lede.includes("The Sentinel"));
  assert.equal(content.headline, "3 green sessions to 2 red.");
});

test("a week that closed nothing prints no dollar figure at all", () => {
  const content = weeklyRecap({ ...recap, realised: null });
  assert.ok(!content.blocks.some((b) => b.eyebrow === "Realised"));
  const all = JSON.stringify(content);
  assert.ok(!all.includes("$"), "no dollar sign survives a week that closed nothing");
});

test("both templates pass the copy rules", () => {
  assert.deepEqual(violations(dailyBrief(brief)), []);
  assert.deepEqual(violations(weeklyRecap(recap)), []);
});

test("the copy rules actually catch what they claim to", () => {
  assert.deepEqual(
    violations({
      subject: "Act now — your score expires",
      lede: "You should consider buying the dip!",
      blocks: [{ eyebrow: "Price", value: "1", tail: "AAPL up 4% today" }],
      provenance: "x",
      cta: { label: "Go", href: "/" },
    }).sort(),
    ["exclamation mark", "market commentary", "prescriptive phrasing", "urgency in the subject"],
  );
});

test("every message carries exactly one link plus the unsubscribe", () => {
  const html = renderHtml(dailyBrief(brief), "https://supercruise.app/unsub?t=x");
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(hrefs.length, 2);
  assert.ok(hrefs[1].includes("unsub"));
});

test("user content is escaped rather than interpolated into the markup", () => {
  const html = renderHtml(
    { ...dailyBrief(brief), lede: '<script>alert("x")</script>' },
    "https://supercruise.app/unsub",
  );
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("every message ships a readable plain-text half", () => {
  const text = renderText(weeklyRecap(recap), "https://supercruise.app/unsub");
  assert.ok(!text.includes("<"));
  assert.ok(text.includes("The Sentinel"));
  assert.ok(text.includes("Stop these emails"));
});
