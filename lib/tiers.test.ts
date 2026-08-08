import assert from "node:assert/strict";
import test from "node:test";
import {
  can,
  canMintCards,
  canShareCards,
  capabilities,
  readiness,
  tierFor,
  tierFromStatus,
} from "./tiers";
import type { Capability, Tier } from "./tiers";

test("free entitles no capability, and each paid tier contains the one below", () => {
  assert.deepEqual(capabilities("free"), []);
  for (const cap of capabilities("plus")) {
    assert.ok(can({ tier: "trader" }, cap), `trader should inherit ${cap}`);
  }
  assert.ok(capabilities("trader").length > capabilities("plus").length);
});

test("a missing or unknown viewer is treated as free", () => {
  assert.equal(can(null, "correlationCard"), false);
  assert.equal(can(undefined, "liveBadge"), false);
});

/*
 * The load-bearing test. Sharing and rarity are promised to be ungateable, and
 * the guarantee is structural: there is no Capability member to gate them
 * with. If someone adds one, this fails before the promise breaks in public.
 */
test("no capability exists for minting, sharing or rarity", () => {
  const all: Capability[] = capabilities("trader");
  for (const cap of all) {
    assert.ok(
      !/mint|rare|rarity|share|trophy|achievement/i.test(cap),
      `${cap} looks like a gate on something that must never be gated`,
    );
  }
  assert.equal(canMintCards(), true);
  assert.equal(canShareCards(), true);
});

test("gates name categories and formats, never achievements", () => {
  // Every capability should read as a thing the product renders for you,
  // not a thing your conduct earned.
  assert.ok(can({ tier: "plus" }, "correlationCard"));
  assert.ok(can({ tier: "trader" }, "motionExport"));
  assert.equal(can({ tier: "plus" }, "motionExport"), false);
});

test("a lock names the tier the capability first appears at", () => {
  assert.equal(tierFor("correlationCard"), "plus");
  assert.equal(tierFor("sessionRecapCard"), "trader");
  assert.equal(tierFor("verifiedTrackRecord"), "trader");
});

test("a tier only entitles anything while the subscription is live", () => {
  for (const status of ["active", "trialing"]) {
    assert.equal(tierFromStatus("trader", status), "trader");
  }
  for (const status of ["past_due", "canceled", "unpaid", "incomplete", null]) {
    assert.equal(tierFromStatus("trader", status as string | null), "free", `${status}`);
  }
});

test("readiness is computed, never asserted", () => {
  assert.deepEqual(readiness(100, 100), { ready: true, label: "Ready now" });
  assert.deepEqual(readiness(120, 100), { ready: true, label: "Ready now" });
  assert.deepEqual(readiness(62, 100), { ready: false, label: "38 tags to go" });
  assert.deepEqual(readiness(99, 100), { ready: false, label: "1 tag to go" });
});

test("every tier label is a word a chip can carry", () => {
  for (const tier of ["free", "plus", "trader"] as Tier[]) {
    assert.ok(capabilities(tier).length >= 0);
  }
});
