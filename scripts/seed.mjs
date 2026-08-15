#!/usr/bin/env node
/**
 * A populated ledger in a throwaway database.
 *
 * There was no way to look at `/home`, `/you` or `/wrapped` in their real
 * state without pointing the app at somebody's actual brokerage history. That
 * makes visual review either impossible or a reason to handle live credentials,
 * and neither is acceptable for something you want to do on every change.
 *
 * So: an in-memory MongoDB, a synthetic fourteen-month ledger, and then **the
 * app's own `backfillScores` and `rebuildDerived`** over it. Nothing on screen
 * is invented by this file — the transactions are, but every figure derived
 * from them is computed by the same production code a real account runs
 * through. A seed that fabricated scores would prove nothing about the screens.
 *
 *   npm run seed              # start, seed, print the URI, hold until Ctrl-C
 *   npm run seed -- --quiet   # same, without the summary
 *
 * The instance is memory-only and dies with the process. It never touches a
 * real deployment.
 */

import { MongoMemoryServer } from "mongodb-memory-server";
import { MongoClient } from "mongodb";
/*
 * Static, not dynamic. `import()` of a .ts through tsx hands back a CJS
 * namespace whose named exports hide under `.default`, and the call site then
 * fails with "ensureIndexes is not a function". These are safe to load before
 * the URI exists because `lib/db/client.ts` reads the environment lazily —
 * nothing connects until the first query.
 */
import { ensureIndexes } from "../lib/db/collections.ts";
import { rebuildDerived } from "../lib/db/derived.ts";
import { backfillScores } from "../lib/db/scoring.ts";
import { mintCard } from "../lib/db/cards.ts";
import { assembleWrapped } from "../lib/wrapped/assemble.ts";
import { storedFrom } from "../lib/cards/types.ts";

const USER_ID = "000000000000000000000001";
const DB = "bagcheck";
const DAYS = 430;

/*
 * A believable book: a couple of long-term compounders, a couple of trades
 * that went well, one that did not, and a crypto position. Weight decides how
 * often a name is traded; drift is the annualised direction of its price.
 */
const BOOK = [
  { symbol: "NVDA", name: "NVIDIA Corporation", start: 78, drift: 2.4, vol: 0.032, weight: 5 },
  { symbol: "AAPL", name: "Apple Inc.", start: 182, drift: 0.22, vol: 0.014, weight: 4 },
  { symbol: "MSFT", name: "Microsoft Corporation", start: 372, drift: 0.31, vol: 0.013, weight: 3 },
  { symbol: "ASML", name: "ASML Holding N.V.", start: 640, drift: 0.28, vol: 0.021, weight: 2 },
  { symbol: "TSLA", name: "Tesla, Inc.", start: 248, drift: -0.34, vol: 0.038, weight: 4 },
  { symbol: "COST", name: "Costco Wholesale Corporation", start: 590, drift: 0.36, vol: 0.011, weight: 2 },
  { symbol: "SHOP", name: "Shopify Inc.", start: 78, drift: -0.12, vol: 0.034, weight: 3 },
];

/*
 * Deterministic pseudo-randomness. A seed that produced a different book on
 * every run would make two screenshots incomparable, which defeats the point
 * of shooting them.
 */
let state = 0x2f6e2b1;
function rand() {
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  return ((state >>> 0) % 100000) / 100000;
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

function isoDay(d) {
  return d.toISOString().slice(0, 10);
}

/** A price path per name, one point per calendar day. */
function paths(from) {
  const out = new Map();
  for (const inst of BOOK) {
    const series = [];
    let price = inst.start;
    for (let i = 0; i < DAYS; i += 1) {
      const daily = inst.drift / 365 + (rand() - 0.5) * inst.vol * 2;
      price = Math.max(1, price * (1 + daily));
      const day = new Date(from.getTime() + i * 86_400_000);
      series.push({ date: isoDay(day), price: Number(price.toFixed(2)) });
    }
    out.set(inst.symbol, series);
  }
  return out;
}

export async function seed({ quiet = false } = {}) {
  const mongod = await MongoMemoryServer.create({ instance: { dbName: DB } });
  const uri = mongod.getUri();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(DB);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const from = new Date(today.getTime() - (DAYS - 1) * 86_400_000);
  const price = paths(from);

  const accountId = "acct-brokerage-1";
  await db.collection("connections").insertOne({
    userId: USER_ID,
    snaptradeUserId: USER_ID,
    snaptradeUserSecret: "seed-not-a-real-secret",
    accounts: [
      { id: accountId, name: "Individual", number: "••4417", institution: "Interactive Brokers" },
      { id: "acct-brokerage-2", name: "Roth IRA", number: "••9082", institution: "Fidelity" },
    ],
    createdAt: from,
    lastSyncAt: today,
    styleBaseline: "long-term",
  });

  /* ── Transactions ── */
  const held = new Map(BOOK.map((b) => [b.symbol, 0]));
  const txns = [];
  let n = 0;

  for (let i = 0; i < DAYS; i += 1) {
    const day = new Date(from.getTime() + i * 86_400_000);
    const dow = day.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    // Roughly two sessions a week with any activity at all.
    if (rand() > 0.42) continue;

    const trades = 1 + Math.floor(rand() * 2);
    for (let t = 0; t < trades; t += 1) {
      const inst = pick(BOOK.flatMap((b) => Array(b.weight).fill(b)));
      const px = price.get(inst.symbol)[i].price;
      const have = held.get(inst.symbol) ?? 0;
      /* Sell only what is actually held, so FIFO has something to match. */
      const selling = have > 0 && rand() > 0.62;
      const units = selling
        ? Math.max(1, Math.round(have * (0.3 + rand() * 0.6)))
        : Math.max(1, Math.round((2000 + rand() * 6000) / px));

      held.set(inst.symbol, selling ? have - units : have + units);
      n += 1;
      txns.push({
        userId: USER_ID,
        externalId: `seed-${n}`,
        accountId,
        date: isoDay(day),
        settledAt: isoDay(new Date(day.getTime() + 2 * 86_400_000)),
        type: selling ? "SELL" : "BUY",
        symbol: inst.symbol,
        units,
        price: px,
        amount: Number((units * px * (selling ? 1 : -1)).toFixed(2)),
        currency: "USD",
        fee: 0,
        institution: "Interactive Brokers",
        description: `${selling ? "Sold" : "Bought"} ${units} ${inst.symbol}`,
        raw: {},
        syncedAt: today,
      });
    }
  }
  await db.collection("transactions").insertMany(txns);

  /*
   * ── Position snapshots ──
   *
   * One per day so the equity curve has something to draw, holding the units
   * actually implied by the transactions up to that date. A snapshot that
   * disagreed with the ledger would put the app's own "units disagree,
   * exclude from statistics" guard in the way of the screenshots.
   */
  const running = new Map(BOOK.map((b) => [b.symbol, { units: 0, cost: 0 }]));
  let cursor = 0;
  const sorted = [...txns].sort((a, b) => a.date.localeCompare(b.date));
  const snapshots = [];

  for (let i = 0; i < DAYS; i += 1) {
    const date = isoDay(new Date(from.getTime() + i * 86_400_000));
    while (cursor < sorted.length && sorted[cursor].date <= date) {
      const tx = sorted[cursor];
      const pos = running.get(tx.symbol);
      if (tx.type === "BUY") {
        pos.cost += tx.units * tx.price;
        pos.units += tx.units;
      } else {
        const avg = pos.units ? pos.cost / pos.units : 0;
        pos.units -= tx.units;
        pos.cost -= avg * tx.units;
      }
      cursor += 1;
    }

    snapshots.push({
      userId: USER_ID,
      accountId,
      date,
      takenAt: new Date(from.getTime() + i * 86_400_000),
      positions: BOOK.filter((b) => (running.get(b.symbol)?.units ?? 0) > 0).map((b) => {
        const pos = running.get(b.symbol);
        return {
          symbol: {
            description: b.name,
            symbol: { symbol: b.symbol, description: b.name },
          },
          units: Number(pos.units.toFixed(4)),
          price: price.get(b.symbol)[i].price,
          average_purchase_price: Number((pos.cost / pos.units).toFixed(4)),
        };
      }),
    });
  }
  await db.collection("positionSnapshots").insertMany(snapshots);

  /*
   * A handful of tagged entries, so the tag loop and anything downstream of it
   * has something to read. Two taps, no text field — the reasons come from the
   * app's own closed list.
   */
  const buys = txns.filter((t) => t.type === "BUY");
  const reasons = ["conviction", "dip", "rebalance", "momentum", "income"];
  await db.collection("tags").insertMany(
    buys.slice(0, 24).map((t, i) => ({
      userId: USER_ID,
      transactionId: t.externalId,
      date: t.date,
      why: reasons[i % reasons.length],
      taggedAt: today,
    })),
  );

  await client.close();

  /*
   * Everything above is raw brokerage shape — the only thing a real sync
   * actually receives. From here the app's own code takes over: one score per
   * day across the whole ledger, then the materialised round trips, daily
   * P&L, equity, hold times and findings. Not a line of it is invented here,
   * which is what makes a screenshot of the result worth looking at.
   */
  process.env.MONGODB_URI = uri;
  process.env.MONGODB_DB = DB;

  await ensureIndexes();
  const scored = await backfillScores(USER_ID);
  await rebuildDerived(USER_ID);

  /*
   * A few cards in the case.
   *
   * The minted block on /you had never been shot with anything in it, because
   * a seeded account mints nothing — so its grid went out unverified while its
   * empty state was the only thing anyone ever saw. These are minted through
   * the app's own path from the app's own assembly: the specs come off
   * `assembleWrapped`, so the figures on them are the ledger's, not the
   * seed's.
   */
  const assembly = await assembleWrapped(USER_ID);
  const mintable = (assembly?.cards ?? []).slice(0, 4);
  for (const card of mintable) {
    await mintCard(USER_ID, storedFrom(card), isoDay(today));
  }


  if (!quiet) {
    console.log(`seeded ${txns.length} transactions, ${snapshots.length} snapshots`);
    console.log(`window ${isoDay(from)} → ${isoDay(today)}`);
    console.log(`scored ${scored.written} days (${scored.from} → ${scored.to}), derived rebuilt`);
    console.log(`minted ${mintable.length} cards`);
  }
  return { mongod, uri, userId: USER_ID };
}

/* Run directly: seed, print, and hold the instance open for a dev server. */
if (import.meta.url === `file://${process.argv[1]}`) {
  const quiet = process.argv.includes("--quiet");
  const { uri, userId } = await seed({ quiet });
  console.log(uri);
  console.log(`DEV_USER_ID=${userId}`);
  await new Promise(() => {});
}
