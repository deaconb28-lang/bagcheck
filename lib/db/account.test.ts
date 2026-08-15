import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { PERSONAL_COLLECTIONS } from "./account";

/**
 * The one thing that can go silently wrong with erasure is a collection that
 * gets added to the store and never added to the delete — the account then
 * reports itself deleted while a table of that person's data survives.
 *
 * `getCollections()` reaches MongoDB, so this reads its source instead: the
 * list of collection names in `collections.ts` is a literal, and comparing
 * two literals is exactly the check that matters here.
 */

function declaredCollections(): string[] {
  const source = readFileSync(new URL("./collections.ts", import.meta.url), "utf8");
  const block = source.slice(
    source.indexOf("export async function getCollections()"),
    source.indexOf("export async function ensureIndexes()"),
  );
  return [...block.matchAll(/db\.collection<\w+>\("(\w+)"\)/g)].map((m) => m[1]);
}

/*
 * Collections that are deliberately not per-user, and why. A name landing here
 * by accident rather than by decision is the failure this test exists to make
 * loud: adding one costs a line in a list, which is a thing a reviewer sees.
 */
const NOT_PERSONAL: Record<string, string> = {
  waitlist: "keyed by email, before an account exists",
  marketCache: "keyed by request, shared across users — the rate limit is per key",
  icons: "third-party artwork, shared, no userId",
  photos: "third-party photographs, shared, no userId",
};

test("every stored collection is either erased or explicitly exempt", () => {
  const declared = declaredCollections();
  assert.ok(declared.length > 10, "collection list should have parsed");

  for (const name of declared) {
    const erased = (PERSONAL_COLLECTIONS as readonly string[]).includes(name);
    const exempt = name in NOT_PERSONAL;
    assert.ok(
      erased !== exempt,
      `"${name}" must be either in PERSONAL_COLLECTIONS or in NOT_PERSONAL, not neither and not both`,
    );
  }
});

test("nothing in the delete list has been renamed out of the store", () => {
  const declared = new Set(declaredCollections());
  for (const name of PERSONAL_COLLECTIONS) {
    assert.ok(declared.has(name), `PERSONAL_COLLECTIONS names "${name}", which no longer exists`);
  }
});

test("the delete list has no duplicates", () => {
  assert.equal(new Set(PERSONAL_COLLECTIONS).size, PERSONAL_COLLECTIONS.length);
});
