import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

/**
 * The web manifest, so a phone that adds Canopy to its home screen gets the
 * mark and the light field rather than a screenshot and a white flash.
 *
 * `background_color` and `theme_color` are the one place besides
 * `app/layout.tsx`'s `themeColor` where --bg's value is written out: a
 * manifest is JSON and cannot cite a custom property. Keep the three in step.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — fitness tracking for your portfolio`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/you",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f4f6",
    theme_color: "#f4f4f6",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
