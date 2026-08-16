/**
 * The public origin, for the files that need an absolute URL and have no
 * request to derive one from — `sitemap.xml`, `robots.txt` and the
 * `metadataBase` every OpenGraph tag resolves against.
 *
 * `APP_URL` first, the same order `lib/origin.ts` uses. The two exist for
 * different reasons — that one takes a request and can fall back to the
 * proxy's forwarding headers, this one runs where there is no request — but
 * they must never disagree about which variable wins.
 */
export function siteOrigin(): string {
  const raw =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : null) ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

export const SITE_NAME = "canopy";
export const SITE_TAGLINE = "Turn your portfolio into a flex";
export const SITE_DESCRIPTION =
  "Connect your brokerage in two taps through SnapTrade. Canopy reads the numbers and turns your year into a Wrapped worth posting — returns, top holdings, best trades, and the ones that got away.";
