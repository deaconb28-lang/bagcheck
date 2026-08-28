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
    /*
     * The lander, never the dashboard.
     *
     * This was `/you`, which meant a phone launching the saved app went
     * straight into the app shell — and a visitor who had not signed in met
     * the signed-out empty state as the *first* thing the product ever showed
     * them: a title, two buttons and no explanation of what they had opened.
     * A home-screen icon is the one door into this product that carries no
     * referrer, no session guarantee and no way back, so it opens on the page
     * that explains itself. A reader who is signed in has "Go to app" in the
     * nav, one tap away.
     *
     * `id` is stated rather than inferred: a manifest with no `id` takes its
     * identity from `start_url`, so changing that silently mints a *second*
     * app as far as the browser is concerned. Pinning it to "/" keeps the
     * installs people already have. It also means iOS, which snapshots the
     * manifest when the icon is added, will keep launching an existing icon
     * at the old address until it is removed and re-added.
     */
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    /*
     * The light ground, like the app and like `themeColor` in
     * `app/layout.tsx`. These were black while the app was permanently dark;
     * light is the default now, so a phone launching the saved app would
     * otherwise flash black and then paint itself light — the same failure
     * these values had before, in the other direction. The note above has
     * always said keep the three in step, and this is the second time that
     * has actually had to be acted on.
     */
    background_color: "#f4f4f6",
    theme_color: "#f4f4f6",
    /*
     * Raster, and not only the SVG.
     *
     * This offered `/icon.svg` at `sizes: "any"` and the 180px apple icon, and
     * Chrome on Android will not take an SVG for a home-screen icon — so an
     * Android reader who installed the app got a generated letter where the
     * dart should have been. 192 and 512 are the two sizes it asks for.
     *
     * The maskable entry is a *different drawing*, not the same file relabelled:
     * a launcher crops to whatever shape it likes and guarantees only the
     * central 80%, and the corners of artwork filling 70% of the frame fall
     * outside that circle. `npm run icons` draws it at a harder inset.
     */
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
