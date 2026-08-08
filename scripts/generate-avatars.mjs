#!/usr/bin/env node
/**
 * Generate the sixteen archetype avatars and store them.
 *
 * Run once against a deployment's environment:
 *
 *   OPENAI_API_KEY=… MONGODB_URI=… node scripts/generate-avatars.mjs
 *   node scripts/generate-avatars.mjs --force        # redraw everything
 *   node scripts/generate-avatars.mjs sentinel keel  # just these
 *
 * The app does not need this — `/api/avatar/[key]` generates on first
 * request and stores the result. This exists so the first sixteen visitors
 * are not the ones paying the latency, and so the set can be reviewed as a
 * set before anyone sees it.
 *
 * Sequential on purpose. Sixteen images is not worth a concurrency bug
 * against an image endpoint's rate limit, and the whole run is a few minutes.
 */

import { MongoClient, Binary } from "mongodb";
import OpenAI from "openai";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("tsx/esm", pathToFileURL("./"));

const { ARCHETYPES } = await import("../lib/archetypes.ts");
const { avatarPrompt } = await import("../lib/avatars/prompt.ts");

const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
const force = process.argv.includes("--force");
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set — nothing to generate with.");
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not set — nowhere to store the result.");
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const mongo = new MongoClient(process.env.MONGODB_URI);
await mongo.connect();
const avatars = mongo.db(process.env.MONGODB_DB || "bagcheck").collection("avatars");
await avatars.createIndex({ key: 1 }, { unique: true });

const targets = ARCHETYPES.filter((a) => !only.length || only.includes(a.key));
let made = 0;
let skipped = 0;

for (const archetype of targets) {
  if (!force && (await avatars.findOne({ key: archetype.key }))) {
    console.log(`· ${archetype.key.padEnd(12)} already stored`);
    skipped += 1;
    continue;
  }

  const prompt = avatarPrompt(archetype);
  try {
    const res = await openai.images.generate({
      model: MODEL,
      prompt,
      size: "1024x1024",
      quality: "medium",
      output_format: "png",
      n: 1,
    });
    const b64 = res.data?.[0]?.b64_json;
    if (!b64) throw new Error("response carried no image data");

    const png = Buffer.from(b64, "base64");
    await avatars.updateOne(
      { key: archetype.key },
      { $set: { key: archetype.key, png: new Binary(png), model: MODEL, prompt, generatedAt: new Date() } },
      { upsert: true },
    );
    made += 1;
    console.log(`✓ ${archetype.key.padEnd(12)} ${archetype.name.padEnd(16)} ${(png.length / 1024).toFixed(0)}kB`);
  } catch (err) {
    // Keep going: one refused or failed image should not cost the other
    // fifteen, and a missing avatar falls back to the drawn emblem.
    console.error(`✗ ${archetype.key.padEnd(12)} ${err instanceof Error ? err.message : err}`);
  }
}

console.log(`\n${made} generated · ${skipped} already stored · ${targets.length - made - skipped} failed`);
await mongo.close();
