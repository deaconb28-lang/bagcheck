#!/usr/bin/env node
/**
 * The cron runner.
 *
 * Railway's cron is a service that runs a command on a schedule, not an HTTP
 * pinger, so this is the command: it calls the app's cron endpoints with the
 * shared secret and reports what came back.
 *
 * It replaces `vercel.json`'s `crons` block, which declared two schedules on a
 * platform this app does not deploy to and therefore never fired once — no
 * nightly score, no email, and no error to notice.
 *
 *   APP_URL       the deployed origin, e.g. https://bagcheck.example
 *   CRON_SECRET   must match the app's, or every call answers 401
 *   CRON_JOBS     optional, comma-separated; defaults to both
 *
 * Exits non-zero if any job fails, so a failed run is visible in Railway's
 * deploy log rather than silently green.
 */

const base = (process.env.APP_URL || "").replace(/\/+$/, "");
const secret = process.env.CRON_SECRET;

if (!base) {
  console.error("APP_URL is not set — nothing to call.");
  process.exit(1);
}
if (!secret) {
  console.error("CRON_SECRET is not set — every call would answer 401.");
  process.exit(1);
}

const jobs = (process.env.CRON_JOBS || "nightly-score,notify")
  .split(",")
  .map((j) => j.trim())
  .filter(Boolean);

let failed = 0;

for (const job of jobs) {
  const url = `${base}/api/cron/${job}`;
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${secret}` },
    });
    const body = await res.text();
    const took = Date.now() - started;

    if (!res.ok) {
      failed += 1;
      console.error(`[cron] ${job} → ${res.status} in ${took}ms: ${body.slice(0, 400)}`);
      continue;
    }
    console.log(`[cron] ${job} → 200 in ${took}ms: ${body.slice(0, 400)}`);
  } catch (err) {
    failed += 1;
    console.error(`[cron] ${job} → ${err instanceof Error ? err.message : String(err)}`);
  }
}

process.exit(failed ? 1 : 0);
