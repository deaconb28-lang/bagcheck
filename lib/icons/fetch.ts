import { getCollections } from "@/lib/db/collections";
import crypto from "node:crypto";
import { creditLine, oauthHeader, sanitizeSvg, SEARCH_PARAMS } from "./noun";
import { ICONS } from "./names";
import type { IconName } from "./names";

/**
 * The only caller of The Noun Project. Two requests per icon — search, then
 * download — which is why an icon is fetched once in the product's lifetime
 * and read from Mongo ever after. An icon does not change, so there is no
 * TTL here: the cache is the store.
 */

const BASE = "https://api.thenounproject.com/v2";

function nounKey(): string | null {
  return process.env.NOUN_PROJECT_KEY || process.env.NOUN_PROJECT_API_KEY || null;
}

function nounSecret(): string | null {
  return process.env.NOUN_PROJECT_SECRET || process.env.NOUN_PROJECT_API_SECRET || null;
}

export interface StoredIcon {
  /**
   * A string, not IconName: this is what came back out of Mongo, and a
   * document written before a name was retired would not narrow. Callers
   * that need the union check with isIconName.
   */
  name: string;
  svg: string;
  /** "Icon by Someone from Noun Project" — rendered on /legal/icons. */
  credit: string;
  nounId: string | null;
}

async function signed<T>(path: string, params: Record<string, string>): Promise<T | null> {
  const key = nounKey();
  const secret = nounSecret();
  if (!key || !secret) return null;

  const url = `${BASE}/${path}?${new URLSearchParams(params)}`;
  const header = oauthHeader(
    "GET",
    url,
    key,
    secret,
    crypto.randomBytes(16).toString("hex"),
    String(Math.floor(Date.now() / 1000)),
  );

  try {
    const res = await fetch(url, {
      headers: { Authorization: header },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 429) {
      console.error("[icons] rate limited by noun project");
      return null;
    }
    if (res.status === 401 || res.status === 403) {
      console.error("[icons] noun project rejected the credentials");
      return null;
    }
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err) {
    console.error("[icons] request failed", path, err);
    return null;
  }
}

interface SearchResponse {
  icons?: Array<{ id?: number | string; attribution?: string; icon_url?: string }>;
}

interface DownloadResponse {
  base64_encoded_file?: string;
  content_type?: string;
}

/** Fetch one icon and store it. Returns null when anything at all goes wrong. */
async function loadFromNoun(name: IconName): Promise<StoredIcon | null> {
  const term = ICONS[name];

  const found = await signed<SearchResponse>("icon", { ...SEARCH_PARAMS, query: term });
  const hit = found?.icons?.[0];
  if (!hit?.id) return null;

  const file = await signed<DownloadResponse>(`icon/${hit.id}/download`, { filetype: "SVG" });
  if (!file?.base64_encoded_file) return null;

  const svg = sanitizeSvg(Buffer.from(file.base64_encoded_file, "base64").toString("utf8"));
  if (!svg) return null;

  return {
    name,
    svg,
    credit: creditLine(hit.attribution ?? null, term),
    nounId: String(hit.id),
  };
}

/** Cache first, network once, and never a second call for the same name. */
export async function getIcon(name: IconName): Promise<StoredIcon | null> {
  let store;
  try {
    ({ icons: store } = await getCollections());
    const hit = await store.findOne({ name });
    if (hit) return hit;
  } catch (err) {
    console.error("[icons] cache unavailable", err);
  }

  const fresh = await loadFromNoun(name);
  if (!fresh) return null;

  if (store) {
    await store
      .updateOne({ name }, { $set: fresh }, { upsert: true })
      .catch((err) => console.error("[icons] cache write failed", err));
  }
  return fresh;
}

/** Everything already fetched, for the credits page. Never calls the API. */
export async function storedIcons(): Promise<StoredIcon[]> {
  try {
    const { icons } = await getCollections();
    return await icons.find({}).sort({ name: 1 }).toArray();
  } catch {
    return [];
  }
}

/**
 * A transparent glyph. The route answers with this rather than an error, so
 * no component has to handle a broken icon — the slot just paints nothing.
 */
export const BLANK_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"></svg>';
