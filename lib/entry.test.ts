import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

/*
 * The doors into the product, asserted as text.
 *
 * Neither of these two files is visible from inside the app, which is exactly
 * how the manifest came to launch the saved home-screen app straight into the
 * dashboard: a stranger who tapped the icon met "Sign in to see your
 * dashboard" on a black field with no nav and no explanation of what they had
 * opened. Nobody looks at a manifest, so nobody saw it.
 *
 * They are read as source rather than imported because `app/manifest.ts` pulls
 * in Next's types and the layout is a React server component; the values here
 * are literals, and a literal is the thing worth pinning.
 */

const manifest = readFileSync("app/manifest.ts", "utf8");
const appLayout = readFileSync("app/(app)/layout.tsx", "utf8");

test("the installed app launches on the landing, never inside the app shell", () => {
  assert.match(manifest, /start_url:\s*"\/"/);
  assert.doesNotMatch(manifest, /start_url:\s*"\/(you|home|start|wrapped)/);
});

test("the manifest states its own id, so changing start_url does not mint a second app", () => {
  assert.match(manifest, /id:\s*"\/"/);
});

test("the manifest's colours stay in step with the black ground", () => {
  assert.match(manifest, /background_color:\s*"#000000"/);
  assert.match(manifest, /theme_color:\s*"#000000"/);
});

test("a visitor with no session is sent to the landing rather than an empty state", () => {
  assert.match(appLayout, /getUserId/);
  assert.match(appLayout, /redirect\("\/"\)/);
});
