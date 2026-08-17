import assert from "node:assert/strict";
import test from "node:test";
import { SYNC_WINDOW_HOURS, syncIsDue } from "./due";

const at = (iso: string) => new Date(iso);
const NOW = at("2026-08-17T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000);

/*
 * The sweep visits twelve users a call every fifteen minutes, so on a table
 * smaller than twelve it wraps every run — and every user was pulled from
 * SnapTrade ninety-six times a day. Production said so: visited 3, wrapped
 * true, connected 3. SnapTrade is 83% of marginal cost, so this rule is a
 * bill, not a preference.
 */

test("a user who has never synced is always due", () => {
  assert.equal(syncIsDue(null, NOW), true);
  assert.equal(syncIsDue(undefined, NOW), true);
});

test("a user synced minutes ago is not due — this is the ninety-six-times case", () => {
  assert.equal(syncIsDue(hoursAgo(0.25), NOW), false);
  assert.equal(syncIsDue(hoursAgo(4), NOW), false);
});

test("a user synced yesterday is due", () => {
  assert.equal(syncIsDue(hoursAgo(24), NOW), true);
  assert.equal(syncIsDue(hoursAgo(48), NOW), true);
});

/*
 * Twenty hours rather than twenty-four. A window equal to the period it guards
 * drifts: each run clears the bar a little later than the last, so a daily
 * sync becomes every-other-day. Shorter than the period is what holds it.
 */
test("the window is under a day, so a daily sync cannot drift into two", () => {
  assert.ok(SYNC_WINDOW_HOURS < 24);
  assert.equal(syncIsDue(hoursAgo(SYNC_WINDOW_HOURS), NOW), true);
  assert.equal(syncIsDue(hoursAgo(SYNC_WINDOW_HOURS - 0.1), NOW), false);
});

test("a timestamp in the future reads as due, not as fresh", () => {
  /* Clock disagreement between hosts must not park a user indefinitely. */
  assert.equal(syncIsDue(new Date(NOW.getTime() + 3_600_000), NOW), true);
});

test("the window is a parameter, so a caller can state its own", () => {
  assert.equal(syncIsDue(hoursAgo(2), NOW, 1), true);
  assert.equal(syncIsDue(hoursAgo(2), NOW, 6), false);
});
