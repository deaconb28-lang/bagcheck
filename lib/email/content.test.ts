import assert from "node:assert/strict";
import { test } from "node:test";
import { dailyBrief, violations, weeklyRecap } from "./content";
import { renderHtml, renderText } from "./render";

const brief = {
  date: "2026-08-08",
  score: 82,
  previousScore: 79,
  sentence: "You held through three straight down weeks.",
  tail: "Patience carried the reading, not exposure.",
  untagged: 4,
  streak: 11,
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
  assert.equal(content.blocks[0].value, "82");
  assert.equal(content.blocks[0].tail, "+3 against yesterday's 79.");
});

test("a first reading does not claim a comparison it does not have", () => {
  const content = dailyBrief({ ...brief, previousScore: null });
  assert.equal(content.blocks[0].tail, "Your first reading.");
});

test("the brief falls back to a factual lede when nothing was written", () => {
  const content = dailyBrief({ ...brief, sentence: "" });
  assert.equal(content.lede, "Your Health score read 82 today.");
});

test("blocks appear only when there is something behind them", () => {
  const quiet = dailyBrief({ ...brief, streak: 1, untagged: 0 });
  assert.equal(quiet.blocks.length, 1);
  assert.equal(dailyBrief(brief).blocks.length, 3);
});

test("the recap describes behaviour across the week, never the market", () => {
  const content = weeklyRecap(recap);
  assert.ok(content.lede.includes("The Sentinel"));
  assert.equal(content.blocks[1].value, "3 / 2");
  assert.ok(content.blocks[1].tail.includes("+$1,240"));
});

test("a week that closed nothing says so rather than printing zero dollars", () => {
  const content = weeklyRecap({ ...recap, realised: null });
  assert.ok(content.blocks[1].tail.includes("Nothing closed"));
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
  const html = renderHtml(dailyBrief(brief), "https://bagcheck.app/unsub?t=x");
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(hrefs.length, 2);
  assert.ok(hrefs[1].includes("unsub"));
});

test("user content is escaped rather than interpolated into the markup", () => {
  const html = renderHtml(
    { ...dailyBrief(brief), lede: '<script>alert("x")</script>' },
    "https://bagcheck.app/unsub",
  );
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
});

test("every message ships a readable plain-text half", () => {
  const text = renderText(weeklyRecap(recap), "https://bagcheck.app/unsub");
  assert.ok(!text.includes("<"));
  assert.ok(text.includes("The Sentinel"));
  assert.ok(text.includes("Stop these emails"));
});
