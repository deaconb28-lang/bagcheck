import { getCollections, isDbConfigured } from "@/lib/db";
import type { CardKind } from "@/lib/cards";
import { creditOf, QUERIES, SEARCH_PARAMS, sizedUrl } from "./query";

/**
 * The only caller of Unsplash.
 *
 * One search per card kind, once in the product's lifetime, then read from
 * Mongo ever after. A photograph does not change and the set is twelve, so
 * this is the store rather than a cache in front of one — the same shape the
 * icon layer uses, for the same reason: every call costs quota.
 *
 * **We store the URL, never the bytes.** Unsplash's terms require images to
 * be hotlinked from their CDN rather than copied onto our own host, so what
 * lands in Mongo is a link plus the credit that has to travel with it.
 */

const BASE = "https://api.unsplash.com";

export function photosEnabled(): boolean {
  return Boolean(process.env.UNSPLASH_ACCESS_KEY);
}

export interface StoredPhoto {
  kind: string;
  url: string;
  color: string;
  creditName: string;
  creditProfileUrl: string;
  creditPhotoUrl: string;
}

interface UnsplashPhoto {
  id: string;
  color?: string | null;
  urls?: { raw?: string | null } | null;
  links?: { html?: string | null; download_location?: string | null } | null;
  user?: { name?: string | null; links?: { html?: string | null } | null } | null;
}

async function call<T>(url: string): Promise<T | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${key}`,
        "Accept-Version": "v1",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 403) {
      // Unsplash spends its rate limit before it 429s; 403 is what a used-up
      // demo key returns, and it is not a reason to break a page.
      console.error("[photos] unsplash rate limit or key rejected");
      return null;
    }
    if (!res.ok) {
      console.error("[photos] unsplash returned", res.status);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.error("[photos] unsplash request failed", err);
    return null;
  }
}

/**
 * Unsplash requires this ping whenever a photo is actually used, and it is
 * how photographers are credited with a download. It is fire-and-forget: the
 * card renders whether or not the ping lands, but skipping it entirely would
 * be using the API outside its terms.
 */
async function reportUse(downloadLocation: string | null | undefined): Promise<void> {
  if (!downloadLocation) return;
  await call<unknown>(downloadLocation);
}

/** Search once, take the first result, record it against the kind. */
async function fetchForKind(kind: CardKind): Promise<StoredPhoto | null> {
  const params = new URLSearchParams({ ...SEARCH_PARAMS, query: QUERIES[kind] });
  const body = await call<{ results?: UnsplashPhoto[] }>(`${BASE}/search/photos?${params}`);
  const photo = body?.results?.[0];
  const raw = photo?.urls?.raw;
  if (!photo || !raw) return null;

  await reportUse(photo.links?.download_location);
  const credit = creditOf(photo);

  const record: StoredPhoto = {
    kind,
    url: sizedUrl(raw),
    color: photo.color || "#12121a",
    creditName: credit.name,
    creditProfileUrl: credit.profileUrl,
    creditPhotoUrl: credit.photoUrl,
  };

  if (isDbConfigured()) {
    const { photos } = await getCollections();
    await photos.updateOne(
      { kind },
      { $set: { ...record, photoId: photo.id, fetchedAt: new Date() } },
      { upsert: true },
    );
  }
  return record;
}

/**
 * Every stored photograph, keyed by card kind.
 *
 * Reads only — it never calls Unsplash, so rendering a page cannot spend
 * quota no matter how much traffic it gets. `npm run photos` is what fills
 * the store. A kind with no row simply has no photograph, and its card falls
 * back to the drawn geometry alone, which is a finished design rather than a
 * placeholder.
 */
export async function storedPhotos(): Promise<Record<string, StoredPhoto>> {
  if (!isDbConfigured()) return {};
  try {
    const { photos } = await getCollections();
    const rows = await photos
      .find({}, { projection: { _id: 0, photoId: 0, fetchedAt: 0 } })
      .toArray();
    return Object.fromEntries(rows.map((r) => [r.kind, r as StoredPhoto]));
  } catch (err) {
    console.error("[photos] store read failed", err);
    return {};
  }
}

/** Fills the store. Called by the script, never by a page. */
export async function refreshPhotos(kinds: CardKind[]): Promise<StoredPhoto[]> {
  const out: StoredPhoto[] = [];
  for (const kind of kinds) {
    const got = await fetchForKind(kind);
    if (got) out.push(got);
  }
  return out;
}
