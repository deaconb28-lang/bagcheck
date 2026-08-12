import type { CardKind } from "@/lib/cards";

/**
 * The pure half of the photography layer.
 *
 * No network and no secret here, so it is importable from anywhere and the
 * whole thing is testable. `fetch.ts` owns the one call that reaches
 * Unsplash.
 */

/** Unsplash asks for the app name on every referral link. */
export const APP_NAME = "bagcheck";

/**
 * One fixed query per card kind.
 *
 * Fixed, because the picture is a property of the *kind* and not of the
 * person: everyone whose year earned the drawdown card gets the same
 * photograph, the same way they get the same geometry over it. A per-user
 * search would make the artwork random, which is the opposite of a template.
 *
 * Every query asks for abstract material — texture, light, surface — and
 * never for a subject. A photograph of a trading floor or a laptop would be
 * stock imagery making a claim about the reader's life; a photograph of
 * brushed metal is a ground for type to sit on.
 */
export const QUERIES: Record<CardKind, string> = {
  health: "abstract concentric ripple texture",
  archetype: "abstract geometric concrete texture",
  longestHold: "long exposure light streak abstract",
  holdRatio: "abstract split gradient minimal surface",
  noPanic: "calm still water abstract minimal",
  streak: "repeating abstract pattern texture",
  bestDecision: "abstract light beam dark minimal",
  drawdownHeld: "abstract eroded stone texture",
  cadence: "abstract radial motion blur",
  monthlyPnl: "abstract layered sediment texture",
  equity: "abstract topographic landscape aerial",
  correlation: "abstract overlapping glass refraction",
  wrapped: "abstract nebula dark texture",
};

/** Landscape only: the band the card crops to is roughly 2.4:1. */
export const SEARCH_PARAMS = {
  orientation: "landscape",
  content_filter: "high",
  per_page: "1",
} as const;

export interface PhotoCredit {
  /** The photographer, as Unsplash returns them. */
  name: string;
  /** Their profile, already carrying the referral parameters. */
  profileUrl: string;
  /** The photo's own page, for the credit link. */
  photoUrl: string;
}

/**
 * Unsplash's attribution rule, applied rather than paraphrased: every link
 * back to them carries the app name and `referral`, and both the
 * photographer and Unsplash are named wherever a photo appears.
 */
export function referral(url: string): string {
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}utm_source=${APP_NAME}&utm_medium=referral`;
}

export function creditOf(photo: {
  user?: { name?: string | null; links?: { html?: string | null } | null } | null;
  links?: { html?: string | null } | null;
}): PhotoCredit {
  return {
    name: photo.user?.name?.trim() || "Unknown",
    profileUrl: referral(photo.user?.links?.html || "https://unsplash.com"),
    photoUrl: referral(photo.links?.html || "https://unsplash.com"),
  };
}

/**
 * The one line rendered under a photo. Unsplash's guideline is that both
 * names appear and both link back, so the sentence is built here rather than
 * assembled differently on each surface.
 */
export function creditLine(credit: PhotoCredit): string {
  return `Photo by ${credit.name} on Unsplash`;
}

/**
 * Sized down at the CDN rather than shipped raw.
 *
 * Unsplash requires that images are hotlinked from their own host — we never
 * re-host the bytes — so the only lever on weight is the transform string
 * they accept on the raw URL. The band is ~400px across at card size and
 * twice that on a retina export, so 1200 wide is generous and a 40MP raw
 * file is not.
 */
export function sizedUrl(raw: string, width = 1200): string {
  if (!raw) return "";
  const joiner = raw.includes("?") ? "&" : "?";
  return `${raw}${joiner}auto=format&fit=crop&w=${width}&q=72`;
}
