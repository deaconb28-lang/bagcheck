#!/usr/bin/env node
/**
 * How long each signed-in screen actually takes, against a seeded ledger.
 *
 *   npm run timings
 *   npm run timings -- --runs=8
 *
 * The screenshot sweep proves a screen is *right*; nothing proved one was
 * fast. Signed-out timings say nothing — every app route short-circuits to an
 * empty state before it touches Mongo, so the only number that means anything
 * is a signed-in render against a ledger with rows in it.
 *
 * It boots the same server the sweep boots, against the same seeded in-memory
 * Mongo, and reports first byte per route: the first hit cold, then the median
 * and the worst of the warm ones. Cold and warm are reported separately on
 * purpose — a route that is fast once the derived document is built and slow
 * before it is a route whose first visit is the one a new reader gets.
 */

import { spawn } from "node:child_process";

const PORT = 3121;
const BASE = `http://127.0.0.1:${PORT}`;
const runs = Number(process.argv.find((a) => a.startsWith("--runs="))?.slice(7) || 6);

/** Signed-in app screens, in the order a reader meets them. */
const ROUTES = ["/you", "/holdings", "/insights", "/wrapped", "/profile"];

const { seed } = await import("./seed.mjs");

async function timeOnce(path) {
  const started = process.hrtime.bigint();
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  await res.arrayBuffer();
  return { ms: Number(process.hrtime.bigint() - started) / 1e6, status: res.status };
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

const { uri, userId, mongod } = await seed({ quiet: true });

const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "--port", String(PORT)],
  {
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(PORT),
      APP_LOCKED: "",
      APP_URL: BASE,
      MONGODB_URI: uri,
      MONGODB_DB: "bagcheck",
      /* Seeded cache only — `finnhub()` is never reached. Same as the sweep. */
      FINNHUB_API_KEY: "seeded-cache-only",
      DEV_USER_ID: userId,
      AUTH_SECRET: "",
      AUTH_GOOGLE_ID: "",
      AUTH_GOOGLE_SECRET: "",
    },
    stdio: ["ignore", "ignore", "pipe"],
    detached: true,
  },
);
child.stderr.on("data", (d) => process.stderr.write(`[next] ${d}`));

const shutdown = async () => {
  try {
    process.kill(-child.pid);
  } catch {
    /* already gone */
  }
  await mongod.stop();
};

try {
  for (let i = 0; i < 90; i += 1) {
    try {
      const res = await fetch(`${BASE}/`);
      if (res.ok) break;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log(`\n  route        cold      median    worst    (${runs} warm runs)\n`);
  const report = [];
  for (const route of ROUTES) {
    const cold = await timeOnce(route);
    const warm = [];
    for (let i = 0; i < runs; i += 1) warm.push((await timeOnce(route)).ms);
    const row = {
      route,
      status: cold.status,
      cold: cold.ms,
      median: median(warm),
      worst: Math.max(...warm),
    };
    report.push(row);
    console.log(
      `  ${route.padEnd(11)} ${`${row.cold.toFixed(0)}ms`.padEnd(9)} ` +
        `${`${row.median.toFixed(0)}ms`.padEnd(9)} ${`${row.worst.toFixed(0)}ms`.padEnd(8)} ` +
        `${row.status === 200 ? "" : `HTTP ${row.status}`}`,
    );
  }
  const slowest = [...report].sort((a, b) => b.median - a.median)[0];
  console.log(`\n  slowest warm: ${slowest.route} at ${slowest.median.toFixed(0)}ms\n`);
} finally {
  await shutdown();
}

process.exit(0);
