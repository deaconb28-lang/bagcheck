import assert from "node:assert/strict";
import test from "node:test";
import { creditLine, oauthHeader, percentEncode, sanitizeSvg } from "./noun";
import { ICONS, iconSrc, isIconName } from "./names";

test("only allowlisted names are icons", () => {
  assert.ok(isIconName("buy"));
  assert.ok(isIconName("dividend"));
  for (const bad of ["", "  ", "../secrets", "buy;drop", "rocket", "toString", "constructor"]) {
    assert.equal(isIconName(bad), false, `${JSON.stringify(bad)} must not resolve`);
  }
  assert.equal(isIconName(null), false);
});

test("every ledger kind the query builder emits has an icon", () => {
  // lib/db/queries.ts KIND_OF can only return these.
  for (const kind of ["buy", "sell", "dividend", "deposit", "withdrawal", "other"]) {
    assert.ok(isIconName(kind), `${kind} rows would render without a glyph`);
  }
});

test("the proxy url is built from the name alone", () => {
  assert.equal(iconSrc("buy"), "/api/icon/buy");
  for (const name of Object.keys(ICONS)) {
    assert.match(iconSrc(name as keyof typeof ICONS), /^\/api\/icon\/[a-z]+$/);
  }
});

test("percent encoding follows RFC 3986, not encodeURIComponent", () => {
  assert.equal(percentEncode("a!b*c'd(e)f"), "a%21b%2Ac%27d%28e%29f");
  assert.equal(percentEncode("a b&c=d"), "a%20b%26c%3Dd");
});

/*
 * Signature fixture from RFC 5849 §1.2 minus the token legs — pinning the
 * nonce and timestamp is the only way to test a signature at all, and a
 * silent break here reads as "the key is wrong" rather than "the signing is".
 */
test("the oauth signature is stable for a fixed nonce and timestamp", () => {
  const header = oauthHeader(
    "GET",
    "https://api.thenounproject.com/v2/icon?limit=1&query=buy",
    "key123",
    "secret456",
    "abc",
    "1700000000",
  );
  const a = header;
  const b = oauthHeader(
    "GET",
    "https://api.thenounproject.com/v2/icon?query=buy&limit=1",
    "key123",
    "secret456",
    "abc",
    "1700000000",
  );
  assert.equal(a, b, "query order must not change the signature");
  assert.match(header, /^OAuth /);
  assert.match(header, /oauth_signature_method="HMAC-SHA1"/);
  assert.match(header, /oauth_consumer_key="key123"/);
  assert.ok(!header.includes("secret456"), "the secret must never be sent");
  assert.match(header, /oauth_signature="[A-Za-z0-9%]+"/);
});

test("a different secret produces a different signature", () => {
  const one = oauthHeader("GET", "https://x.test/a", "k", "s1", "n", "1");
  const two = oauthHeader("GET", "https://x.test/a", "k", "s2", "n", "1");
  assert.notEqual(one, two);
});

test("sanitizing strips script, handlers and javascript urls", () => {
  const dirty =
    '<svg xmlns="http://www.w3.org/2000/svg"><script>fetch("/x")</script>' +
    '<path d="M0 0" onload="alert(1)" onclick=\'alert(2)\'/>' +
    '<a href="javascript:alert(3)"><circle r="1"/></a>' +
    "<foreignObject><body>hi</body></foreignObject></svg>";
  const clean = sanitizeSvg(dirty)!;
  assert.ok(!/script/i.test(clean), clean);
  assert.ok(!/onload|onclick/i.test(clean), clean);
  assert.ok(!/javascript:/i.test(clean), clean);
  assert.ok(!/foreignObject/i.test(clean), clean);
  assert.ok(clean.includes('d="M0 0"'), "the drawing must survive");
});

test("anything that is not an svg document is rejected", () => {
  for (const bad of ["", "not svg", "<html><svg/></html>", '{"error":"nope"}']) {
    assert.equal(sanitizeSvg(bad), null, `${JSON.stringify(bad)} should not be served`);
  }
  assert.ok(sanitizeSvg('<?xml version="1.0"?><svg viewBox="0 0 1 1"></svg>'));
});

test("a credit always names something, even with no attribution", () => {
  assert.equal(creditLine("Buy by Ann from Noun Project", "buy"), "Buy by Ann from Noun Project");
  assert.equal(creditLine(null, "buy"), "buy icon from Noun Project");
  assert.equal(creditLine("   ", "sell"), "sell icon from Noun Project");
});
