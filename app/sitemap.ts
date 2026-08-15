import type { MetadataRoute } from "next";
import { siteOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

/**
 * The public map. Signed-in routes are absent for the same reason robots.txt
 * disallows them — they render a sign-in screen to anyone who is not the
 * account holder, and a sitemap listing five copies of one sign-in screen is
 * worse than no sitemap.
 *
 * Minted cards are deliberately not listed. A card's slug is 96 bits of
 * randomness and that is its entire access model; publishing the list would
 * hand every card ever minted to anyone who reads the file.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  const now = new Date();

  return [
    { url: `${origin}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${origin}/start`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${origin}/legal/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/legal/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/legal/icons`, lastModified: now, changeFrequency: "monthly", priority: 0.1 },
    { url: `${origin}/legal/photos`, lastModified: now, changeFrequency: "monthly", priority: 0.1 },
  ];
}
