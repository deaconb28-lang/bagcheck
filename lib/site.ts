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

export const SITE_NAME = "supercruise";
/*
 * Supercruise is sustained supersonic flight without afterburner — speed you
 * hold rather than speed you spend. A flight recorder is the instrument that
 * matches it and the product's own hardest constraint: it writes down what the
 * aircraft did and it never touches the stick.
 */
export const SITE_TAGLINE = "A flight recorder for your portfolio";
export const SITE_DESCRIPTION =
  "Connect your brokerage in two taps through SnapTrade. Supercruise reads every trade you made and writes down how you actually flew, then turns the year into a Wrapped worth posting — returns, top holdings, best trades, and the ones that got away.";

/**
 * The host a share card prints under its own footer.
 *
 * It was the string "supercruise.app", written out in three places — a card
 * component, the OpenGraph renderer and the public card page — which meant a
 * deployment served from anywhere else printed a URL that does not resolve to
 * it. It is derived from the configured origin now, so the card advertises
 * wherever the product actually lives and a rename of the domain reaches all
 * three at once.
 */
export function shareHost(): string {
  return siteOrigin().replace(/^https?:\/\//, "");
}
