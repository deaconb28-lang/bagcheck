import assert from "node:assert/strict";
import { test } from "node:test";
import { sign, unsubscribeUrl, verify } from "./token";

const SECRET = "test-secret-not-a-real-one";

test("a token verifies for the id it was minted for", () => {
  const token = sign("user-a", SECRET);
  assert.ok(verify("user-a", token, SECRET));
});

test("a token does not carry across users, tokens or secrets", () => {
  const token = sign("user-a", SECRET);
  assert.equal(verify("user-b", token, SECRET), false);
  assert.equal(verify("user-a", sign("user-b", SECRET), SECRET), false);
  assert.equal(verify("user-a", token, "another-secret"), false);
});

test("a malformed token is rejected rather than throwing", () => {
  assert.equal(verify("user-a", "", SECRET), false);
  assert.equal(verify("user-a", "short", SECRET), false);
  assert.equal(verify("user-a", "x".repeat(500), SECRET), false);
});

test("the token is url-safe — it travels in a query string", () => {
  const token = sign("user with spaces & symbols", SECRET);
  assert.equal(token, encodeURIComponent(token));
});

test("the url falls back to the settings screen when nothing can sign", () => {
  const before = process.env.AUTH_SECRET;
  const beforeCron = process.env.CRON_SECRET;
  delete process.env.AUTH_SECRET;
  delete process.env.CRON_SECRET;
  assert.equal(unsubscribeUrl("user-a", "https://bagcheck.app"), "https://bagcheck.app/profile");
  if (before) process.env.AUTH_SECRET = before;
  if (beforeCron) process.env.CRON_SECRET = beforeCron;
});
