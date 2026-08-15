import assert from "node:assert/strict";
import test from "node:test";
import { MIN_LOGO_BYTES, isLogoResponse, logoSources, missIsStale } from "./sources";

/*
 * The whole point of the chain is that a deployment with no logo.dev key
 * still renders real marks. That is one assertion, and it is the one that
 * would have caught the live bug: every holding on the deployed app rendered
 * a monogram because `LOGO_DEV_TOKEN` was never set.
 */
test("the chain works without a key", () => {
  const chain = logoSources("AAPL", 64, null);
  assert.ok(chain.length >= 2, "a keyless deployment still has sources");
  assert.ok(!chain.some((s) => s.name === "logo.dev"));
  for (const source of chain) {
    assert.ok(source.url.startsWith("https://"));
    assert.ok(source.url.includes("AAPL"));
  }
});

test("a key puts logo.dev first, and the key is in its URL only", () => {
  const chain = logoSources("NVDA", 128, "sk-test");
  assert.equal(chain[0].name, "logo.dev");
  assert.ok(chain[0].url.includes("token=sk-test"));
  for (const source of chain.slice(1)) {
    assert.ok(!source.url.includes("sk-test"), `${source.name} must not carry the key`);
  }
});

/*
 * logo.dev substitutes a monogram of its own unless told not to. Ours is
 * drawn in this product's palette; theirs is not.
 */
test("logo.dev is asked not to substitute its own fallback", () => {
  const [first] = logoSources("MSFT", 64, "sk-test");
  assert.ok(first.url.includes("fallback=404"));
  assert.ok(first.url.includes("size=64"));
});

test("a symbol with a dot survives the URL", () => {
  for (const source of logoSources("BRK.B", 64, null)) {
    assert.ok(!source.url.includes(" "));
    assert.ok(source.url.includes("BRK.B") || source.url.includes("BRK%2EB"));
  }
});

/*
 * Both keyless sources answer an unknown ticker with a 200 and a body — parqet
 * with nothing, FMP with 22 bytes — so the status code alone would store a
 * placeholder as if it were a mark. The real marks they serve start around
 * 380 bytes.
 */
test("a placeholder body is not a logo", () => {
  assert.equal(isLogoResponse("image/png", 0), false);
  assert.equal(isLogoResponse("image/png", 22), false);
  assert.equal(isLogoResponse("image/png", MIN_LOGO_BYTES - 1), false);
  assert.equal(isLogoResponse("image/png", 384), true);
});

test("an error page with a 200 on it is not a logo", () => {
  assert.equal(isLogoResponse("text/html", 4000), false);
  assert.equal(isLogoResponse("application/json", 4000), false);
  assert.equal(isLogoResponse(null, 4000), false);
});

test("the content type is read loosely enough to survive a charset", () => {
  assert.equal(isLogoResponse("IMAGE/PNG", 900), true);
  assert.equal(isLogoResponse(" image/webp ", 900), true);
});

/*
 * A miss is stored so an obscure holding does not call three third parties on
 * every page view, and it expires so a newly listed symbol fills itself in.
 */
test("a miss goes stale, a fresh one does not", () => {
  const now = new Date("2026-08-15T12:00:00Z");
  const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);
  assert.equal(missIsStale(daysAgo(1), now), false);
  assert.equal(missIsStale(daysAgo(6), now), false);
  assert.equal(missIsStale(daysAgo(8), now), true);
});
