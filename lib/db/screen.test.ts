import assert from "node:assert/strict";
import test from "node:test";
import { syncClock } from "./screen";

/*
 * The sync pill answers one question — is what I am looking at current — and
 * it used to answer it in UTC. A reader in California who synced at 5pm saw
 * "SYNCED 00:00" and could not tell whether that was minutes or a day ago.
 * An elapsed time needs no timezone, which is why it is one.
 */

const NOW = new Date("2026-08-15T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

test("a ledger that never synced has nothing to say", () => {
  assert.equal(syncClock(null, NOW), null);
  assert.equal(syncClock(undefined, NOW), null);
});

test("a fresh read is just now", () => {
  assert.equal(syncClock(ago(0), NOW), "just now");
  assert.equal(syncClock(ago(45 * SECOND), NOW), "just now");
});

/*
 * The server writing the sync and the server rendering the page are not
 * guaranteed to agree on the clock. A few seconds of skew must read as fresh,
 * never as a negative number or a sync in the future.
 */
test("clock skew reads as fresh rather than as the future", () => {
  assert.equal(syncClock(new Date(NOW.getTime() + 30 * SECOND), NOW), "just now");
});

test("minutes, then hours, then days", () => {
  assert.equal(syncClock(ago(5 * MINUTE), NOW), "5m ago");
  assert.equal(syncClock(ago(59 * MINUTE), NOW), "59m ago");
  assert.equal(syncClock(ago(2 * HOUR), NOW), "2h ago");
  assert.equal(syncClock(ago(23 * HOUR), NOW), "23h ago");
  assert.equal(syncClock(ago(3 * DAY), NOW), "3d ago");
  assert.equal(syncClock(ago(29 * DAY), NOW), "29d ago");
  assert.equal(syncClock(ago(70 * DAY), NOW), "2mo ago");
});

/* Rounding down, so the pill never claims a sync is fresher than it is. */
test("it rounds down, never up", () => {
  assert.equal(syncClock(ago(119 * MINUTE), NOW), "1h ago");
  assert.equal(syncClock(ago(47 * HOUR), NOW), "1d ago");
});

test("the boundaries land on the larger unit", () => {
  assert.equal(syncClock(ago(90 * SECOND), NOW), "1m ago");
  assert.equal(syncClock(ago(60 * MINUTE), NOW), "1h ago");
  assert.equal(syncClock(ago(24 * HOUR), NOW), "1d ago");
  assert.equal(syncClock(ago(30 * DAY), NOW), "1mo ago");
});
