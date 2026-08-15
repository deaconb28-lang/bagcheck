import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * What crawlers may read.
 *
 * The marketing surfaces are open. Everything behind sign-in is disallowed —
 * not as a security measure (it is already gated) but because a crawler
 * following those paths only ever reaches a sign-in screen, and indexing a
 * hundred copies of one sign-in screen helps nobody.
 *
 * `/c/` is the exception among the private-ish paths: a minted card is meant
 * to unfurl in a feed, so crawlers must be able to read it. `/api/` is closed
 * outright.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/pricing", "/legal/", "/c/", "/start", "/wrapped"],
        disallow: ["/api/", "/home", "/you", "/profile", "/debug", "/auth/"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
