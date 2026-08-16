/**
 * The four faces a Wrapped card sets in, preloaded by the page that frames it.
 *
 * A card is a self-contained document in an iframe, so it has its own font set
 * and asks for its own copies — which are *different URLs* from the ones
 * `next/font` serves the app, because that pipeline hashes its filenames. The
 * app being in General Sans therefore does nothing for the card, and a deck of
 * a dozen frames each starting four cold downloads is a deck that shows its
 * pictures before its type.
 *
 * These preloads warm the HTTP cache before the frames parse, so by the time a
 * card asks, the answer is already local. `crossOrigin` is required even for a
 * same-origin font: without it the preload is treated as a different request
 * than the CSS-initiated one and the file is fetched twice, which is worse
 * than not preloading at all.
 *
 * The list is written out rather than derived. `card.css` is the only other
 * place these names appear, and four literals that must match four literals is
 * a smaller risk than a build step that parses a stylesheet.
 */
const FACES = [
  "/fonts/general-sans-500.woff2",
  "/fonts/general-sans-600.woff2",
  "/fonts/general-sans-700.woff2",
  "/fonts/jetbrains-mono-latin.woff2",
];

export function CardFonts() {
  return (
    <>
      {FACES.map((href) => (
        <link
          key={href}
          rel="preload"
          as="font"
          type="font/woff2"
          href={href}
          crossOrigin="anonymous"
        />
      ))}
    </>
  );
}
