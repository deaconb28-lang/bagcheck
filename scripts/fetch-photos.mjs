/**
 * Fills the photograph store: one Unsplash search per card kind, written to
 * Mongo, run by hand rather than by a page.
 *
 * Pages only ever read the store, so no amount of traffic can spend quota.
 * Re-running this re-picks the photograph for every kind, which is a visible
 * change to artefacts people have already posted — so run it deliberately,
 * not on deploy.
 *
 *   npm run photos
 */
import { QUERIES } from "../lib/unsplash/query.ts";
import { photosEnabled, refreshPhotos } from "../lib/unsplash/fetch.ts";

if (!photosEnabled()) {
  console.error("UNSPLASH_ACCESS_KEY is not set — nothing to do.");
  process.exit(1);
}
if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not set — there is nowhere to store the result.");
  process.exit(1);
}

const kinds = Object.keys(QUERIES);
console.log(`Fetching ${kinds.length} photographs…`);

const got = await refreshPhotos(kinds);

for (const p of got) {
  console.log(`  ${p.kind.padEnd(14)} ${p.creditName}`);
}
console.log(`\nStored ${got.length} of ${kinds.length}.`);
if (got.length < kinds.length) {
  console.log("Kinds without a photograph keep their drawn artwork, which is a finished state.");
}
process.exit(0);
