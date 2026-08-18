import assert from "node:assert/strict";
import test from "node:test";
import {
  TRIAL_DAYS,
  TIER_PRICE,
  CAPABILITY_LABEL,
  hasAccess,
  priceLine,
  TRIAL_TIER,
  can,
  canMintCards,
  canShareCards,
  capabilities,
  effectiveTier,
  isTier,
  normaliseTier,
  readiness,
  tierFor,
  tierFromStatus,
  trialLine,
  trialState,
} from "./tiers";
import type { Capability } from "./tiers";

test("free buys nothing", () => {
  assert.deepEqual(capabilities("free"), []);
  assert.equal(can({ tier: "free" }, "publicationExport"), false);
});

test("pro buys every capability the product declares", () => {
  const all: Capability[] = [
    "reportCarousel",
    "correlationCard",
    "publicationExport",
    "transparentExport",
    "liveBadge",
  ];
  for (const cap of all) {
    assert.equal(can({ tier: "pro" }, cap), true, `pro should include ${cap}`);
  }
  assert.equal(capabilities("pro").length, all.length);
});

test("an absent viewer is free, not a crash", () => {
  assert.equal(can(null, "liveBadge"), false);
  assert.equal(can(undefined, "liveBadge"), false);
});

/*
 * The promise the paywall must keep. `Capability` has no member for minting,
 * rarity or sharing, so a gate against them cannot be written — these two take
 * no argument on purpose.
 */
test("minting and sharing are never gated", () => {
  assert.equal(canMintCards(), true);
  assert.equal(canShareCards(), true);
});

test("every capability belongs to the paid plan", () => {
  for (const cap of capabilities("pro")) {
    assert.equal(tierFor(cap), "pro");
  }
});

/*
 * Live subscriptions and stored documents still say plus and trader. A rename
 * in this repo must never drop a paying subscriber to free.
 */
test("legacy plan names map forward rather than falling to free", () => {
  assert.equal(normaliseTier("plus"), "pro");
  assert.equal(normaliseTier("trader"), "pro");
  assert.equal(normaliseTier("pro"), "pro");
});

test("anything unrecognised is free", () => {
  assert.equal(normaliseTier("enterprise"), "free");
  assert.equal(normaliseTier(null), "free");
  assert.equal(normaliseTier(undefined), "free");
  assert.equal(normaliseTier(7), "free");
});

test("a viewer stored under a legacy plan still has its capabilities", () => {
  assert.equal(can({ tier: "plus" as never }, "liveBadge"), true);
  assert.equal(can({ tier: "trader" as never }, "reportCarousel"), true);
});

test("isTier accepts only the two live names", () => {
  assert.equal(isTier("free"), true);
  assert.equal(isTier("pro"), true);
  assert.equal(isTier("plus"), false);
  assert.equal(isTier("nonsense"), false);
});

/* A subscription entitles nothing unless Stripe says it is live. */
test("a dead subscription is free whatever plan it names", () => {
  assert.equal(tierFromStatus("pro", "canceled"), "free");
  assert.equal(tierFromStatus("pro", "past_due"), "free");
  assert.equal(tierFromStatus("pro", null), "free");
});

test("active and trialing are the two live statuses", () => {
  assert.equal(tierFromStatus("pro", "active"), "pro");
  assert.equal(tierFromStatus("pro", "trialing"), "pro");
});

test("a live subscription stored under a legacy plan resolves to pro", () => {
  assert.equal(tierFromStatus("trader" as never, "active"), "pro");
});

/* ── The trial ── */

test("no connection means no trial to describe", () => {
  const state = trialState(null, new Date("2026-08-15"));
  assert.deepEqual(state, { active: false, endsOn: null, expired: false });
  assert.equal(trialLine(state), null);
});

test("the trial runs thirty days from the connection", () => {
  assert.equal(TRIAL_DAYS, 30);
  const connected = new Date("2026-09-01T12:00:00Z");
  const state = trialState(connected, new Date("2026-09-20T12:00:00Z"));
  assert.equal(state.active, true);
  assert.equal(state.expired, false);
  assert.equal(state.endsOn, "2026-10-01");
});

test("it expires on the day it says it will", () => {
  const connected = new Date("2026-09-01T12:00:00Z");
  const state = trialState(connected, new Date("2026-10-02T12:00:00Z"));
  assert.equal(state.active, false);
  assert.equal(state.expired, true);
});

/*
 * The clause that stops the paywall landing on everyone at once. An account
 * connected long before the plan existed gets its thirty days from the
 * cutover, not from a date eight months in the past.
 */
test("a connection older than the cutover is measured from the cutover", () => {
  const longAgo = new Date("2026-01-05T12:00:00Z");
  const state = trialState(longAgo, new Date("2026-08-25T12:00:00Z"));
  assert.equal(state.active, true);
  assert.equal(state.expired, false);
  assert.equal(state.endsOn, "2026-09-17");
});

test("the cutover never shortens a window it does not own", () => {
  /* Connected after it — their own date wins, and is later. */
  const after = new Date("2026-10-10T12:00:00Z");
  const state = trialState(after, new Date("2026-10-20T12:00:00Z"));
  assert.equal(state.endsOn, "2026-11-09");
});

test("the trial grants the paid plan while it runs", () => {
  const active = trialState(new Date("2026-09-01"), new Date("2026-09-03"));
  assert.equal(effectiveTier("free", active), TRIAL_TIER);
  assert.equal(TRIAL_TIER, "pro");
});

test("an expired trial falls back to free", () => {
  const expired = trialState(new Date("2026-09-01"), new Date("2026-10-20"));
  assert.equal(effectiveTier("free", expired), "free");
});

/* Paid always wins — a subscriber is on their plan, not on a trial clock. */
test("a paid plan outlives its own trial", () => {
  const expired = trialState(new Date("2026-09-01"), new Date("2026-10-20"));
  assert.equal(effectiveTier("pro", expired), "pro");
});

test("the trial line states a date and never a countdown", () => {
  const active = trialState(new Date("2026-09-01"), new Date("2026-09-03"));
  const line = trialLine(active) ?? "";
  assert.ok(line.includes("2026-10-01"));
  assert.ok(!/\bdays? left\b/i.test(line));
  assert.ok(!line.includes("!"));
});

/* ── Readiness ── */

test("readiness is ready once the samples are there", () => {
  assert.deepEqual(readiness(100, 100), { ready: true, label: "Ready now" });
  assert.deepEqual(readiness(140, 100), { ready: true, label: "Ready now" });
});

test("readiness counts what is actually missing", () => {
  assert.deepEqual(readiness(62, 100), { ready: false, label: "38 tags to go" });
  assert.deepEqual(readiness(99, 100), { ready: false, label: "1 tag to go" });
});

/* ── The gate above every capability ── */

test("a subscriber has access whatever the trial says", () => {
  const expired = trialState(new Date("2026-09-01"), new Date("2026-10-20"));
  assert.equal(hasAccess("pro", expired), true);
});

test("a running trial has access without a card", () => {
  const active = trialState(new Date("2026-09-01"), new Date("2026-09-20"));
  assert.equal(hasAccess("free", active), true);
});

test("an expired trial with no plan does not", () => {
  const expired = trialState(new Date("2026-09-01"), new Date("2026-10-20"));
  assert.equal(hasAccess("free", expired), false);
});

/*
 * The one that keeps a hard paywall humane: an account that never connected a
 * brokerage has never started a trial, so it has never used the product and
 * must not meet a pay screen for something it has not been shown.
 */
test("an account that never connected is not locked out", () => {
  const none = trialState(null, new Date("2026-10-20"));
  assert.equal(hasAccess("free", none), true);
});

test("the price is written once and printed the same everywhere", () => {
  assert.equal(priceLine(), "$14.99/month");
  assert.equal(TIER_PRICE.pro.monthly, 14.99);
  /* No annual plan — a second price is a second thing to keep in step. */
  assert.equal(TIER_PRICE.pro.yearly, null);
});

test("the plan advertises nothing the gates do not deliver", () => {
  /* Every capability named on a pricing surface is one a route checks. */
  for (const name of Object.keys(CAPABILITY_LABEL)) {
    assert.ok(capabilities("pro").includes(name as never), name);
  }
});
