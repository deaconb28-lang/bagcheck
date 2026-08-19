import { getCollections } from "@/lib/db/collections";

/**
 * Finnhub — the market-data layer.
 *
 * What this is for: correcting a stale mark, naming a ticker the brokerage
 * only gave us a symbol for, and knowing when a held name reports earnings.
 *
 * What it is emphatically not for: prices as an event. Supercruise never sends a
 * price alert, so nothing here may become one. A quote is only ever used to
 * make a number the user already owns more accurate, and the product never
 * volunteers that a price moved.
 */

export function isMarketConfigured(): boolean {
  return Boolean(marketToken());
}

export function marketToken(): string | null {
  return (
    process.env.FINNHUB_API_KEY ||
    process.env.FINNHUB_TOKEN ||
    process.env.MARKET_DATA_API_KEY ||
    null
  );
}

/**
 * Finnhub's free tier allows 60 calls a minute. A single portfolio can hold
 * more names than that, so nothing here fans out without both a cache in
 * front of it and a cap on how many requests are in flight at once.
 */
export const MAX_IN_FLIGHT = 6;

/** Run tasks with a bounded number in flight, preserving input order. */
export async function pooled<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

/** One Finnhub call. Returns null on any failure — market data is a bonus. */
export async function finnhub<T>(
  path: string,
  params: Record<string, string>,
): Promise<T | null> {
  const token = marketToken();
  if (!token) return null;

  const qs = new URLSearchParams({ ...params, token });
  try {
    const res = await fetch(`https://finnhub.io/api/v1/${path}?${qs}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 429) {
      console.error("[market] rate limited by finnhub");
      return null;
    }
    if (res.status === 401) {
      console.error("[market] finnhub rejected the token");
      return null;
    }
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.error("[market] request failed", path, err);
    return null;
  }
}

/**
 * A shared cache in Mongo, because the rate limit is per key and not per
 * user: two people holding AAPL should cost one call, not two. Entries expire
 * via a TTL index, so nothing here needs sweeping.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T | null>,
): Promise<T | null> {
  let hit: { value: unknown } | null = null;
  let store: Awaited<ReturnType<typeof getCollections>>["marketCache"] | null = null;

  try {
    const collections = await getCollections();
    store = collections.marketCache;
    const doc = await store.findOne({ key });
    if (doc && doc.expiresAt > new Date()) return doc.value as T;
    hit = doc;
  } catch (err) {
    // The cache being unavailable makes market data slower, not absent — and
    // it must never take down a screen that has already read the ledger.
    console.error("[market] cache unavailable", err);
  }

  const fresh = await load();
  if (fresh == null) {
    // Serve a stale entry rather than nothing when the upstream is down.
    return (hit?.value as T) ?? null;
  }

  if (store) {
    await store
      .updateOne(
        { key },
        {
          $set: {
            value: fresh,
            fetchedAt: new Date(),
            expiresAt: new Date(Date.now() + ttlSeconds * 1000),
          },
          $setOnInsert: { key },
        },
        { upsert: true },
      )
      .catch((err) => console.error("[market] cache write failed", err));
  }
  return fresh;
}
