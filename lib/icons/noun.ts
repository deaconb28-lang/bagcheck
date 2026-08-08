import crypto from "node:crypto";

/**
 * Signing and sanitizing — the server-only half of the icon layer.
 *
 * Split from names.ts because this imports node:crypto, and the vocabulary
 * has to stay importable from a client bundle. Everything here is pure: the
 * network lives in fetch.ts, and the secret never leaves the server.
 */

/**
 * Line icons at a light weight, to sit beside the drawn route marks rather
 * than shout over them. Public-domain icons carry no attribution burden but
 * are a much smaller pool, so the credit line is built either way.
 */
export const SEARCH_PARAMS = { limit: "1", styles: "line", include_svg: "1" } as const;

/** RFC 3986 — OAuth requires the stricter escaping, not encodeURIComponent's. */
export function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!*'()]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/**
 * Two-legged OAuth 1.0a: the Noun Project signs with the client key and
 * secret alone, because no endpoint reaches private user data. Nonce and
 * timestamp are arguments so a test can pin them and assert the signature.
 */
export function oauthHeader(
  method: string,
  url: string,
  key: string,
  secret: string,
  nonce: string,
  timestamp: string,
): string {
  const parsed = new URL(url);
  const oauth: Record<string, string> = {
    oauth_consumer_key: key,
    oauth_nonce: nonce,
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: timestamp,
    oauth_version: "1.0",
  };

  // Query params are signed alongside the oauth ones, sorted by encoded key.
  const merged: Record<string, string> = { ...oauth };
  for (const [k, v] of parsed.searchParams) merged[k] = v;

  const normalized = Object.keys(merged)
    .map((k) => [percentEncode(k), percentEncode(merged[k])])
    .sort((a, b) => (a[0] === b[0] ? a[1].localeCompare(b[1]) : a[0].localeCompare(b[0])))
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  const base = [
    method.toUpperCase(),
    percentEncode(`${parsed.origin}${parsed.pathname}`),
    percentEncode(normalized),
  ].join("&");

  // The token secret is empty, but the separator is still required.
  const signature = crypto
    .createHmac("sha1", `${percentEncode(secret)}&`)
    .update(base)
    .digest("base64");

  return `OAuth ${Object.entries({ ...oauth, oauth_signature: signature })
    .map(([k, v]) => `${percentEncode(k)}="${percentEncode(v)}"`)
    .join(", ")}`;
}

/**
 * Third-party SVG, served from our own origin. It is only ever painted as a
 * CSS mask or an <img>, both of which disable scripting — this strips the
 * active parts anyway, because "the source is trusted" is not a control.
 */
export function sanitizeSvg(svg: string): string | null {
  if (!/^\s*(<\?xml[^>]*\?>\s*|<!DOCTYPE[^>]*>\s*)*<svg[\s>]/i.test(svg)) return null;
  return svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|xlink:href)\s*=\s*("|')\s*(javascript|data):[^"']*\2/gi, "");
}

/** "Icon by Someone from Noun Project" — CC-BY wants the creator named. */
export function creditLine(attribution: string | null, term: string): string {
  return attribution?.trim() || `${term} icon from Noun Project`;
}
