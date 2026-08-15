import { Binary } from "mongodb";
import { getCollections } from "./collections";
import { fetchLogo, missIsStale } from "@/lib/logos";

/**
 * The store in front of the logo chain.
 *
 * Same shape as the icons store and for the same reasons: a mark does not
 * change, every call is somebody else's quota, and a holdings table renders
 * twenty of them at once. Store first, network once, and never a second call
 * for the same symbol at the same size.
 *
 * The bytes live here rather than a URL — the photographs are the other way
 * round only because Unsplash's terms require hotlinking. A logo has no such
 * condition, and holding the bytes means a row's mark is one Mongo read
 * rather than a third-party round trip on the render path.
 */

export interface ResolvedLogo {
  bytes: Buffer;
  type: string;
}

/**
 * A ticker's mark, or null when no source has one.
 *
 * Null is a real answer, not an error: the caller draws the monogram. It is
 * recorded as a document so the next render of that ticker costs a Mongo read
 * instead of three outbound requests, and it expires so a newly listed symbol
 * fills itself in.
 */
export async function logoFor(symbol: string, size: number): Promise<ResolvedLogo | null> {
  let store;
  try {
    ({ logos: store } = await getCollections());
    const hit = await store.findOne({ symbol, size });
    if (hit?.bytes) {
      return { bytes: Buffer.from(hit.bytes.buffer), type: hit.type ?? "image/png" };
    }
    /* A miss on file and still fresh — do not walk the chain again. */
    if (hit && !missIsStale(hit.fetchedAt)) return null;
  } catch (err) {
    // A store that is down costs the cache, not the logo.
    console.error("[logos] store unavailable", err);
  }

  const fresh = await fetchLogo(symbol, size);

  if (store) {
    await store
      .updateOne(
        { symbol, size },
        {
          $set: {
            symbol,
            size,
            bytes: fresh ? new Binary(Buffer.from(fresh.bytes)) : null,
            type: fresh?.type ?? null,
            source: fresh?.source ?? null,
            fetchedAt: new Date(),
          },
        },
        { upsert: true },
      )
      .catch((err) => console.error("[logos] store write failed", symbol, err));
  }

  if (!fresh) return null;
  return { bytes: Buffer.from(fresh.bytes), type: fresh.type };
}
