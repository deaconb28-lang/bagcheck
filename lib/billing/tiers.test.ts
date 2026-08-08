import assert from "node:assert/strict";
import test from "node:test";
import { can, canMintCards, features, isTier, tierFromStatus } from "./tiers";

test("free unlocks no formats", () => {
  assert.deepEqual(features("free"), []);
});

test("trader is a superset of plus", () => {
  for (const f of features("plus")) assert.ok(can("trader", f), `trader missing ${f}`);
  assert.ok(can("trader", "motionExport"));
  assert.ok(!can("plus", "motionExport"));
});

test("nothing about sharing or rarity is gateable", () => {
  // The promise is structural: if a Feature for these ever appears, this
  // fails and the promise has been broken in code, not just in copy.
  const all = features("trader").join(" ").toLowerCase();
  for (const banned of ["mint", "rare", "rarity", "share"]) {
    assert.doesNotMatch(all, new RegExp(banned), `"${banned}" must not be a gated feature`);
  }
  assert.equal(canMintCards(), true);
});

test("a lapsed subscription falls back to free", () => {
  assert.equal(tierFromStatus("trader", "active"), "trader");
  assert.equal(tierFromStatus("trader", "trialing"), "trader");
  assert.equal(tierFromStatus("trader", "past_due"), "free");
  assert.equal(tierFromStatus("trader", "canceled"), "free");
  assert.equal(tierFromStatus("plus", null), "free");
});

test("isTier rejects anything not a tier", () => {
  assert.ok(isTier("plus"));
  assert.ok(!isTier("pro"));
  assert.ok(!isTier(undefined));
});
