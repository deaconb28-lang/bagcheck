import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, siteOrigin } from "@/lib/site";
import "../styles/tokens.css";
import "./globals.css";

/*
 * ── Every face, served by us ──
 *
 * These were five `next/font/google` declarations, which download their woff2
 * files from `fonts.gstatic.com` **during the build**. That made every build a
 * coin flip on a third party answering, and it came up tails on CI run
 * 31859584940: "Failed to fetch `Playfair Display` from Google Fonts. > Build
 * failed because of webpack errors." The two runs either side of it passed.
 *
 * `.env.example` is the contract and CI compiles with no secrets at all,
 * precisely so nothing external can break a build. A build that needs Google
 * to answer is the same fault in different clothes, so the files live in
 * `public/fonts` and `npm run fonts` is what refreshes them.
 *
 * Only the latin and latin-ext cuts are vendored — the whole set is 450kB.
 *
 * Every path below is written out in full because `next/font/local` parses
 * this call statically and rejects anything it cannot read as a literal — a
 * shared `FONT_DIR` constant fails the build with "Font loader values must be
 * explicitly written literals."
 */

/*
 * Display — the tabular figures inside rows and tables, where a column has to
 * line up. `.num` is its whole job.
 */
const display = localFont({
  src: [
    { path: "../public/fonts/space-grotesk-latin.woff2", weight: "300 700", style: "normal" },
    { path: "../public/fonts/space-grotesk-latin-ext.woff2", weight: "300 700", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
});

/*
 * Serif — share cards only. On a card it is a *voice* (the stamp and
 * editorial templates), one of four; in the app it is retired. Enforced by
 * scope: the variable is only read inside components/cards and app/c.
 */
const serif = localFont({
  src: [
    { path: "../public/fonts/playfair-display-latin.woff2", weight: "400 900", style: "normal" },
    { path: "../public/fonts/playfair-display-latin-ext.woff2", weight: "400 900", style: "normal" },
  ],
  variable: "--font-serif",
  display: "swap",
});

/* The fallback under General Sans, and the face the share cards set ledes in. */
const body = localFont({
  src: [
    { path: "../public/fonts/public-sans-latin.woff2", weight: "100 900", style: "normal" },
    { path: "../public/fonts/public-sans-latin-ext.woff2", weight: "100 900", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
});

// Labels, eyebrows, timestamps, counts, comparatives. Never body copy,
// never headings. The moment a metric label renders in the body face the
// system starts to smear.
const mono = localFont({
  src: [
    { path: "../public/fonts/jetbrains-mono-latin.woff2", weight: "100 800", style: "normal" },
    { path: "../public/fonts/jetbrains-mono-latin-ext.woff2", weight: "100 800", style: "normal" },
  ],
  variable: "--font-mono",
  display: "swap",
});

/*
 * Poster face — share cards only, and nowhere else in the product.
 *
 * The three-family rule is about the *app*, where a fourth face is how a
 * system starts to smear. A share card is not in the app: it is minted to
 * leave, and it competes in a feed against everything else in that feed. A
 * high-contrast serif set at 58px loses that fight; a condensed grotesque at
 * 120px does not.
 *
 * Enforced by scope rather than by discipline — the variable is only read
 * inside components/cards and app/og.
 */
const poster = localFont({
  src: [
    { path: "../public/fonts/anton-latin.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/anton-latin-ext.woff2", weight: "400", style: "normal" },
  ],
  variable: "--font-poster",
  display: "swap",
});

/*
 * **General Sans — the product's voice, declared once.**
 *
 * It was a `<link rel="stylesheet">` to `api.fontshare.com`, duplicated in
 * three group layouts. That put a third party in the critical render path of
 * every page and handed it every reader's IP — while `/legal/privacy` says no
 * trackers run here and names every other processor. One local declaration
 * replaces all three, and the claim on that page becomes true.
 *
 * ITF Free Font Licence, which permits self-hosting; see public/fonts/LICENCES.
 */
const voice = localFont({
  src: [
    { path: "../public/fonts/general-sans-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/general-sans-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/general-sans-600.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/general-sans-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-voice",
  display: "swap",
});

/*
 * Site-wide metadata.
 *
 * `metadataBase` is what every relative OpenGraph URL resolves against — and
 * without it, the `opengraph-image` convention emits a relative path that no
 * unfurler can fetch. On a product whose entire pitch is that people post it,
 * a link that does not unfurl is a broken feature rather than a nicety.
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE.toLowerCase()}`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} — ${SITE_TAGLINE.toLowerCase()}`,
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE.toLowerCase()}`,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

/*
 * `viewportFit: "cover"` is load-bearing on phones: without it,
 * env(safe-area-inset-bottom) resolves to zero and the bottom tab bar sits
 * under the iPhone home indicator.
 *
 * The theme colour is the app's field. It is written out because a meta tag
 * cannot cite a custom property, which makes this the one place `--bg`'s value
 * is stated twice and the two have to be kept in step by hand.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    /*
     * Dark, and only dark.
     *
     * The app was light-with-a-dark-mode and a switch on the header. The
     * dashboard this now implements is a dark instrument — the field, the
     * race, the gradient artefact card and the saturated allocation ring were
     * all drawn on #08080D, and half of them have no legible light twin. A
     * mode switch whose other position is a design nobody drew is a switch
     * that ships a second, worse product.
     *
     * The light values stay in `tokens.css` rather than being deleted: they
     * are simply not selected. Marketing is unaffected either way — it speaks
     * `--mk-*`, which is stated once and never flipped by mode.
     */
    <html
      lang="en"
      /*
       * The mode is no longer stamped here.
       *
       * It was `data-mode="dark"`, permanently, and the full light palette
       * sat in `:root` unselected — history rather than a second product.
       * Both are now real: the script below reads the reader's stored choice,
       * falls back to the system preference, and writes the attribute before
       * first paint so neither mode flashes the other on the way in.
       */
      className={`${display.variable} ${serif.variable} ${body.variable} ${mono.variable} ${poster.variable} ${voice.variable}`}
    >
      <head>
        {/*
          Before paint, so a reader who chose light never sees black first.
          It is inline and tiny for the same reason every anti-flash script
          is: anything that arrives with the bundle arrives too late.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var m=localStorage.getItem('sc-mode');" +
              "if(m!=='light'&&m!=='dark'){m=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}" +
              "document.documentElement.dataset.mode=m;}catch(e){document.documentElement.dataset.mode='dark';}})()",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
