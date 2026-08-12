import assert from "node:assert/strict";
import { test } from "node:test";
import { APP_NAME, QUERIES, creditLine, creditOf, referral, sizedUrl } from "./query";

test("every card kind has a query, and none of them names a subject", () => {
  const kinds = Object.keys(QUERIES);
  assert.equal(kinds.length, 13, "twelve cards plus the annual summary");
  for (const [kind, q] of Object.entries(QUERIES)) {
    assert.ok(q.length > 0, `${kind} has a query`);
    /*
     * The rule the queries exist to keep: these are grounds for type, not
     * pictures of a life. A photograph of a person or a trading desk would
     * make a claim about the reader that the ledger never made.
     */
    for (const banned of ["person", "people", "man", "woman", "trader", "office", "laptop", "money"]) {
      assert.ok(!q.includes(banned), `${kind} must not search for "${banned}"`);
    }
  }
});

test("referral parameters are appended, whatever the url already carries", () => {
  assert.equal(
    referral("https://unsplash.com/@someone"),
    `https://unsplash.com/@someone?utm_source=${APP_NAME}&utm_medium=referral`,
  );
  assert.equal(
    referral("https://unsplash.com/photos/x?ixid=abc"),
    `https://unsplash.com/photos/x?ixid=abc&utm_source=${APP_NAME}&utm_medium=referral`,
  );
});

test("credit survives a photo with missing fields", () => {
  const credit = creditOf({});
  assert.equal(credit.name, "Unknown");
  assert.ok(credit.profileUrl.startsWith("https://unsplash.com"));
  assert.ok(credit.profileUrl.includes("utm_source"));
  assert.equal(creditLine(credit), "Photo by Unknown on Unsplash");
});

test("credit uses the photographer and links back to both", () => {
  const credit = creditOf({
    user: { name: " Ada Lovelace ", links: { html: "https://unsplash.com/@ada" } },
    links: { html: "https://unsplash.com/photos/abc" },
  });
  assert.equal(credit.name, "Ada Lovelace");
  assert.ok(credit.profileUrl.includes("/@ada"));
  assert.ok(credit.photoUrl.includes("/photos/abc"));
  assert.equal(creditLine(credit), "Photo by Ada Lovelace on Unsplash");
});

test("urls are sized at the CDN rather than shipped raw", () => {
  const out = sizedUrl("https://images.unsplash.com/photo-1?ixid=z", 1200);
  assert.ok(out.includes("w=1200"));
  assert.ok(out.includes("auto=format"));
  assert.ok(out.startsWith("https://images.unsplash.com/"), "hotlinked, never re-hosted");
  assert.equal(sizedUrl(""), "", "an absent url stays absent rather than becoming a broken one");
});
