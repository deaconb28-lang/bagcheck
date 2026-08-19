import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FORMAT_SIZE,
  downloadName,
  imageUrl,
  shareTargets,
  shareText,
  xIntent,
} from "./share";

const URL_ = "https://supercruise.app/c/abc123";
const TEXT = "Longest hold — 412 days on ASML";

test("X gets a real intent, and it is x.com rather than a redirect", () => {
  const href = xIntent(URL_, TEXT);
  assert.ok(href.startsWith("https://x.com/intent/post?"));
  const params = new URLSearchParams(href.split("?")[1]);
  assert.equal(params.get("url"), URL_);
  assert.equal(params.get("text"), TEXT);
});

test("the intent encodes rather than concatenating", () => {
  const href = xIntent("https://b.app/c/a?x=1&y=2", "100% & rising");
  assert.ok(!href.includes("100% &"));
  const params = new URLSearchParams(href.split("?")[1]);
  assert.equal(params.get("text"), "100% & rising");
  assert.equal(params.get("url"), "https://b.app/c/a?x=1&y=2");
});

test("a browser that can share files routes Instagram and TikTok natively", () => {
  const targets = shareTargets(URL_, TEXT, { canShareFiles: true, canShareLink: true });
  const ig = targets.find((t) => t.id === "instagram")!;
  const tt = targets.find((t) => t.id === "tiktok")!;
  assert.equal(ig.action.kind, "native");
  assert.equal(tt.action.kind, "native");
});

test("without file sharing they become downloads, never dead links", () => {
  const targets = shareTargets(URL_, TEXT, { canShareFiles: false, canShareLink: false });
  for (const id of ["instagram", "tiktok"] as const) {
    const target = targets.find((t) => t.id === id)!;
    assert.equal(target.action.kind, "download");
    // The note has to say why, because "download" is not what a user expected.
    assert.match(target.note, /no web composer/i);
  }
});

test("no target ever opens an Instagram or TikTok URL — neither has one", () => {
  for (const caps of [
    { canShareFiles: true, canShareLink: true },
    { canShareFiles: false, canShareLink: false },
  ]) {
    for (const target of shareTargets(URL_, TEXT, caps)) {
      if (target.action.kind !== "open") continue;
      assert.ok(
        !/instagram\.com|tiktok\.com/.test(target.action.href),
        `${target.id} points at a compose endpoint that does not exist`,
      );
    }
  }
});

test("each destination is offered the aspect it actually accepts", () => {
  const targets = shareTargets(URL_, TEXT, { canShareFiles: true, canShareLink: true });
  const formatOf = (id: string) => {
    const a = targets.find((t) => t.id === id)!.action;
    return a.kind === "native" || a.kind === "download" ? a.format : null;
  };
  // 4:5 is the tallest the Instagram feed shows without cropping.
  assert.equal(formatOf("instagram"), "feed");
  assert.deepEqual(FORMAT_SIZE.feed, { w: 1080, h: 1350 });
  // TikTok is 9:16, same as stories.
  assert.equal(formatOf("tiktok"), "story");
  assert.deepEqual(FORMAT_SIZE.story, { w: 1080, h: 1920 });
});

test("the unfurl size carries no query — it is the default render", () => {
  assert.equal(imageUrl("abc", "unfurl"), "/og/abc");
  assert.equal(imageUrl("abc", "story"), "/og/abc?format=story");
  assert.equal(imageUrl("a/b", "feed"), "/og/a%2Fb?format=feed");
});

test("a saved file is nameable in a camera roll", () => {
  assert.equal(downloadName("longestHold", "story"), "supercruise-longestHold-story.png");
});

test("every target says what the tap will actually do", () => {
  for (const caps of [
    { canShareFiles: true, canShareLink: true },
    { canShareFiles: false, canShareLink: false },
  ]) {
    for (const target of shareTargets(URL_, TEXT, caps)) {
      assert.ok(target.note.length > 12, target.id);
      assert.ok(!target.note.includes("!"), target.id);
    }
  }
});

test("the share text describes and never instructs", () => {
  const text = shareText("Longest hold", "412 days on ASML. Longer than you have held anything else.");
  assert.ok(!text.includes("!"));
  assert.ok(!/\b(check out|follow|link in bio|you should)\b/i.test(text));
  assert.ok(!text.endsWith("."), "the URL follows, so it does not end in a stop");
});
