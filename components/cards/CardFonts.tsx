/**
 * The faces a Wrapped deck sets in, preloaded by the page that frames it.
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
 * place these names appear, and nine literals that must match nine literals is
 * a smaller risk than a build step that parses a stylesheet.
 *
 * It grew from four when the twelve cards stopped sharing one type direction.
 * Every card sets its hero and title in its own display voice, and a deck
 * shows all twelve, so every voice is on the critical path of the same screen
 * — preloading four of nine would just move the flash of fallback type onto
 * the other five. They are variable files covering their whole weight range,
 * which is why five more voices is five more requests rather than fifteen.
 */
const FACES = [
  "/fonts/general-sans-500.woff2",
  "/fonts/general-sans-600.woff2",
  "/fonts/general-sans-700.woff2",
  "/fonts/jetbrains-mono-latin.woff2",
  "/fonts/anton-latin.woff2",
  "/fonts/playfair-display-latin.woff2",
  "/fonts/space-grotesk-latin.woff2",
  "/fonts/outfit-latin.woff2",
  "/fonts/public-sans-latin.woff2",
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
