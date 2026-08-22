import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

/**
 * The web manifest, so a phone that adds Supercruise to its home screen gets the
 * mark and the light field rather than a screenshot and a white flash.
 *
 * `background_color` and `theme_color` are the one place besides
 * `app/layout.tsx`'s `themeColor` where --bg's value is written out: a
 * manifest is JSON and cannot cite a custom property. Keep the three in step.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — ${SITE_TAGLINE.toLowerCase()}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/you",
    display: "standalone",
    orientation: "portrait",
    /*
     * Black, like the app and like `themeColor` in `app/layout.tsx`. These
     * were `#f4f4f6` — a light grey left over from the light-first build —
     * so a phone launching the saved app flashed pale and then painted
     * itself black. The comment above has always said keep the three in
     * step; this is the commit where they are.
     */
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
