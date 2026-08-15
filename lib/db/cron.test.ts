import assert from "node:assert/strict";
import test from "node:test";
import { closesSweep } from "./cron";

/*
 * The nightly jobs used to loop every connected user inside one request under
 * a 60-second cap, which covered about two accounts before the platform killed
 * it. The sweep replaces that, and its one non-obvious decision is when a call
 * has reached the end of the table — wrong in either direction and the job
 * quietly stops covering people while still answering 200.
 */

const BATCH = 12;

test("a full batch never closes the sweep", () => {
  assert.equal(closesSweep(BATCH, BATCH, BATCH), false);
});

test("a short batch worked all the way through closes it", () => {
  assert.equal(closesSweep(BATCH, 5, 5), true);
  assert.equal(closesSweep(BATCH, 1, 1), true);
});

/*
 * The case that matters most. A short batch cut off by the time budget looks
 * like the end of the table and is not — wrapping here would reset the cursor
 * over users this call never reached.
 */
test("a short batch cut off by the clock does not close it", () => {
  assert.equal(closesSweep(BATCH, 5, 2), false);
  assert.equal(closesSweep(BATCH, 5, 0), false);
});

test("a full batch cut off by the clock does not close it either", () => {
  assert.equal(closesSweep(BATCH, BATCH, 3), false);
});

/* An empty batch is handled before this is reached, but it must not lie. */
test("an empty batch is trivially complete", () => {
  assert.equal(closesSweep(BATCH, 0, 0), true);
});

/*
 * The sweep must make progress on every call. With a batch size of one — the
 * degenerate configuration — one user per call and a wrap only when the table
 * is empty, which is what keeps a single-user deployment from wrapping on
 * every call and rescoring the same person for ever.
 */
test("a batch size of one still terminates", () => {
  assert.equal(closesSweep(1, 1, 1), false);
  assert.equal(closesSweep(1, 0, 0), true);
});
