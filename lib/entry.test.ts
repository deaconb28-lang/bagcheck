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

test("the manifest, the theme colour and the ground all state the same value", () => {
  /*
   * The real invariant is agreement, not a particular hex. A manifest is JSON
   * and a theme colour is a meta tag, so neither can cite `--bg` — these are
   * the places its value is written out by hand, and the failure they produce
   * is a phone launching the saved app in one ground and repainting into the
   * other. It has now happened once in each direction.
   */
  const layout = readFileSync("app/layout.tsx", "utf8");
  const tokens = readFileSync("styles/tokens.css", "utf8");

  const bg = /:root\s*\{[\s\S]*?--bg:\s*(#[0-9a-fA-F]{6})/.exec(tokens)?.[1];
  assert.ok(bg, "the default ground is stated in :root");

  const themed = /themeColor:\s*"(#[0-9a-fA-F]{6})"/.exec(layout)?.[1];
  const background = /background_color:\s*"(#[0-9a-fA-F]{6})"/.exec(manifest)?.[1];
  const theme = /theme_color:\s*"(#[0-9a-fA-F]{6})"/.exec(manifest)?.[1];

  assert.equal(themed?.toLowerCase(), bg.toLowerCase(), "layout themeColor drifted from --bg");
  assert.equal(background?.toLowerCase(), bg.toLowerCase(), "manifest background drifted");
  assert.equal(theme?.toLowerCase(), bg.toLowerCase(), "manifest theme colour drifted");
});

test("the app opens light unless the reader has chosen otherwise", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");
  assert.match(layout, /m='light'/);
  assert.match(layout, /dataset\.mode='light'/, "the catch path falls back to light too");
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
