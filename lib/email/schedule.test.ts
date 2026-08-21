import assert from "node:assert/strict";
import test from "node:test";

import { SEND_CADENCE, scheduledSend } from "./schedule";

/** 2026-08-21 is a Friday, so the week around it is easy to reason about. */
const at = (iso: string) => new Date(iso);

test("Monday morning sends the brief", () => {
  const hit = scheduledSend(at("2026-08-24T12:00:00Z"));
  assert.deepEqual(hit, { kind: "brief", window: "monday-morning" });
});

test("Friday evening sends the recap", () => {
  const hit = scheduledSend(at("2026-08-21T22:30:00Z"));
  assert.deepEqual(hit, { kind: "recap", window: "friday-evening" });
});

test("the windows are wide enough for the cron to miss a tick", () => {
  // Every quarter hour across both windows is a send, which is what makes a
  // dropped tick survivable.
  for (const hour of [12, 13]) {
    for (const minute of [0, 15, 30, 45]) {
      const t = `2026-08-24T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`;
      assert.equal(scheduledSend(at(t))?.kind, "brief", t);
    }
  }
  for (const hour of [22, 23]) {
    for (const minute of [0, 15, 30, 45]) {
      const t = `2026-08-21T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`;
      assert.equal(scheduledSend(at(t))?.kind, "recap", t);
    }
  }
});

test("nothing sends outside the two windows", () => {
  assert.equal(scheduledSend(at("2026-08-24T11:59:00Z")), null, "before Monday's window");
  assert.equal(scheduledSend(at("2026-08-24T14:00:00Z")), null, "after Monday's window");
  assert.equal(scheduledSend(at("2026-08-21T21:59:00Z")), null, "before Friday's window");
  assert.equal(scheduledSend(at("2026-08-25T12:30:00Z")), null, "Tuesday morning");
  assert.equal(scheduledSend(at("2026-08-26T22:30:00Z")), null, "Wednesday evening");
  assert.equal(scheduledSend(at("2026-08-23T12:30:00Z")), null, "Sunday");
});

test("no window crosses midnight UTC", () => {
  /*
   * The send log claims a day by {userId, date}. A window spanning two UTC
   * dates would be two claims and therefore two messages, which is the one
   * thing this product promises email will never do.
   */
  assert.equal(scheduledSend(at("2026-08-21T23:59:00Z"))?.kind, "recap");
  assert.equal(scheduledSend(at("2026-08-22T00:00:00Z")), null, "Saturday is not a send day");
});

test("both kinds have their cadence written down", () => {
  assert.equal(SEND_CADENCE.brief, "Monday morning");
  assert.equal(SEND_CADENCE.recap, "Friday evening");
});
