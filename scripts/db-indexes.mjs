#!/usr/bin/env node
/**
 * Apply the index set to whatever `MONGODB_URI` points at, and report it.
 *
 *   npm run db:indexes            # apply, then list what exists
 *   npm run db:indexes -- --dry   # list what exists, change nothing
 *
 * The indexes are declared in `lib/db/collections.ts` and were only ever
 * created as a side effect of a sync, a scoring run or an insight write. That
 * is fine for a database someone is already using and wrong for every other
 * case: a fresh deployment has no indexes until the first person connects a
 * brokerage, and an index added in a release does not exist until whichever
 * path happens to call `ensureIndexes` runs — on a table that by then may be
 * large enough for the build to matter.
 *
 * So this is the deliberate act. It is idempotent, it is safe to run against
 * production, and it prints the resulting index set per collection so "is the
 * schema actually applied" is a question with an answer rather than a hope.
 *
 * It reports the collections that carry no index beyond `_id`, because that is
 * the shape of the bug it was written after: three tables — badges, waitlist
 * and the sweep cursor — that every read scanned and every upsert could
 * duplicate under concurrency.
 */

import { createIndexes, getCollections, getDb } from "../lib/db/collections.ts";

const dry = process.argv.includes("--dry");

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI is not set — there is nothing to apply this to.");
  process.exit(1);
}

if (!dry) {
  console.log("applying…");
  await createIndexes();
}

const db = await getDb();
const collections = await getCollections();
const names = Object.keys(collections).sort();

let bare = 0;
let total = 0;

console.log(`\n${db.databaseName}\n`);
for (const name of names) {
  /*
   * Read back from the server rather than from the declaration. The point of
   * the report is to say what the database has, and a listing derived from the
   * same file that did the creating would agree with any mistake in it.
   */
  const indexes = await db.collection(name).indexes();
  const own = indexes.filter((i) => i.name !== "_id_");
  total += own.length;
  if (!own.length) bare += 1;

  const summary = own.length
    ? own
        .map((i) => {
          const keys = Object.keys(i.key).join("+");
          const flags = [i.unique ? "unique" : null, i.expireAfterSeconds != null ? "ttl" : null]
            .filter(Boolean)
            .join(",");
          return flags ? `${keys} (${flags})` : keys;
        })
        .join("  ·  ")
    : "— nothing but _id";

  console.log(`  ${name.padEnd(18)} ${summary}`);
}

console.log(
  `\n${names.length} collections, ${total} indexes` +
    (bare ? `, ${bare} carrying nothing but _id` : ""),
);

process.exit(0);
