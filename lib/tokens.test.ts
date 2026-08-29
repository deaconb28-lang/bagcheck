import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * The palette, pinned as text.
 *
 * Two rules, and both were broken silently for as long as the app was dark
 * only — which is exactly how long nobody could see it.
 *
 * **Every token needs a value on both grounds.** An unresolved `var()` does
 * not fall through to the next value in the list: it invalidates the whole
 * declaration it sits in. So a token declared only inside
 * `html[data-mode="dark"]` does not merely render the wrong colour in light,
 * it deletes every rule that mentions it. The holdings heatmap is what made
 * that visible — its tile background names `--glass-lit` inside a gradient, so
 * on the light ground the flagship chart drew as a white rectangle with seven
 * tickers floating on it, with every automated check green.
 *
 * **A palette value outside this file is a colour that only knows one
 * ground.** "Small text on the dark field needs 60% white" was written down as
 * `rgba(255, 255, 255, 0.6)` in ten stylesheets; on white every one of them
 * read 1.00:1 — the holdings table heads, the company names, the weights and
 * the insight bodies, all of it invisible.
 */

const ROOT = join(import.meta.dirname, "..");
const CSS = readFileSync(join(ROOT, "styles/tokens.css"), "utf8");

function block(from: string): string {
  const at = CSS.indexOf(from);
  assert.notEqual(at, -1, `${from} is no longer in tokens.css`);
  const end = CSS.indexOf("\n}", at);
  return CSS.slice(at, end);
}

function declared(chunk: string): Set<string> {
  return new Set([...chunk.matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:/gm)].map((m) => m[1]));
}

test("every dark token has a light value", () => {
  const light = declared(block(":root {"));
  const dark = declared(block('html[data-mode="dark"] {'));
  const missing = [...dark].filter((t) => !light.has(t)).sort();
  assert.deepEqual(
    missing,
    [],
    `declared only in dark: ${missing.join(", ")} — an unresolved var() invalidates its whole declaration`,
  );
});

/*
 * The five files below are the ones allowed to repeat a palette value, and the
 * reason is the same in all of them: an artefact with no stylesheet. A story
 * player is a lightbox and a lightbox is black with white chrome whatever the
 * theme does; the marketing world is one ground, stated once, and never
 * flipped by mode.
 */
const EXEMPT = [
  "components/cards/StoryViewer.module.css",
  "app/(app)/app.module.css",
  "app/(marketing)",
  "app/(flex)",
];

function stylesheets(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) stylesheets(full, out);
    else if (name.endsWith(".css")) out.push(full);
  }
  return out;
}

test("no stylesheet sets text to a literal white or black", () => {
  const offenders: string[] = [];
  for (const dir of ["app", "components"]) {
    for (const file of stylesheets(join(ROOT, dir))) {
      const rel = file.slice(ROOT.length + 1);
      if (EXEMPT.some((e) => rel.startsWith(e))) continue;
      for (const [i, line] of readFileSync(file, "utf8").split("\n").entries()) {
        if (/^\s*color:\s*(rgba?\(\s*255|rgba?\(\s*0\s*,|#fff|#000)/i.test(line)) {
          offenders.push(`${rel}:${i + 1} ${line.trim()}`);
        }
      }
    }
  }
  assert.deepEqual(offenders, [], `a literal ink knows one ground:\n${offenders.join("\n")}`);
});
