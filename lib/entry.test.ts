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
const favicon = readFileSync("app/icon.svg", "utf8");
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

test("the manifest carries raster icons, because Android will not take an SVG", () => {
  assert.match(manifest, /icon-192\.png/);
  assert.match(manifest, /icon-512\.png/);
});

test("the maskable icon is its own file, not the same drawing relabelled", () => {
  assert.match(manifest, /icon-maskable-512\.png[^}]*purpose: "maskable"/);
  assert.doesNotMatch(manifest, /"\/icon-512\.png"[^}]*purpose: "maskable"/);
});

test("the favicon drops the wake, which is mud at the size a favicon is drawn", () => {
  /* The two wake strokes go sub-pixel below about 48px. The dart and the
     broken ring are the whole mark at 16. */
  assert.match(favicon, /M28 5\.6 L9\.6 16\.8/);
  assert.doesNotMatch(favicon, /M13\.4 22\.8/);
  assert.doesNotMatch(favicon, /M8\.4 18\.8/);
});

test("the favicon's ground follows the reader's scheme, so it is not a hole in a dark tab bar", () => {
  assert.match(favicon, /prefers-color-scheme:\s*dark/);
  assert.match(favicon, /\.ground\s*\{\s*fill:\s*none\s*\}/);
});
