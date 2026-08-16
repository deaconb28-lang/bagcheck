import assert from "node:assert/strict";
import test from "node:test";
import { appLocked } from "./launch";

test("a deployment with no variables at all is open", () => {
  delete process.env.APP_LOCKED;
  delete process.env.APP_UNLOCKED;
  assert.equal(appLocked(), false);
});

test("APP_LOCKED=1 shuts it", () => {
  process.env.APP_LOCKED = "1";
  assert.equal(appLocked(), true);
  delete process.env.APP_LOCKED;
});

test("the older APP_UNLOCKED=0 still shuts it", () => {
  process.env.APP_UNLOCKED = "0";
  assert.equal(appLocked(), true);
  delete process.env.APP_UNLOCKED;
});

test("a deployment still carrying APP_UNLOCKED=1 stays open", () => {
  process.env.APP_UNLOCKED = "1";
  assert.equal(appLocked(), false);
  delete process.env.APP_UNLOCKED;
});
