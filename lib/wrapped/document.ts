import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fitHero, stampLogos } from "./personalise";

/**
 * A stored card, made into a page a browser can draw.
 *
 * What the pipeline stores is the template filled in — markup that still
 * points at `card.css` by a relative href. That is right for storage and
 * wrong for every place the card is actually shown: the story view frames it
 * with `srcdoc`, where relative URLs resolve against the *parent* page rather
 * than against the template's folder, so the stylesheet would silently fail
 * to load and the card would render as unstyled text on white.
 *
 * So the stylesheet is inlined here, at the boundary, along with the tokens it
 * imports. Everything else the card asks for — the backgrounds under
 * `/wrapped`, the faces under `/fonts` — is already an absolute path served
 * out of `public`, so those resolve on their own.
 *
 * This is also where `fitHero` and `stampLogos` run. The size a hero needs
 * depends on how many characters the value has, and the address of a ticker's
 * mark depends on the ticker — both are facts about drawing rather than about
 * the card's contents, so they belong on the way to pixels and not in what the
 * gate checked. One function turns a stored card into a shown one, which is
 * what keeps those two from drifting apart.
 */

/** Read once per process. The stylesheet does not change between requests. */
let sheet: Promise<string> | null = null;

function stylesheet(): Promise<string> {
  sheet ??= (async () => {
    const [tokens, card] = await Promise.all([
      readFile(join(process.cwd(), "styles/tokens.css"), "utf8"),
      readFile(join(process.cwd(), "wrapped/templates/card.css"), "utf8"),
    ]);
    /*
     * The import is resolved by hand rather than left for the browser: an
     * `@import` inside an inline `<style>` would be a second request against
     * a path that does not exist under `public`.
     */
    return `${tokens}\n${card.replace(/@import[^;]+;/, "")}`;
  })();
  return sheet;
}

/**
 * What the card says about where its numbers came from.
 *
 * The template states the brokerage, because that is true of every card a
 * reader mints. It is not true of the sample year, and this product's entire
 * claim is that its figures came off an account — so a demo card that kept the
 * line would be the one lie the whole thing cannot afford. Swapped here rather
 * than made a token: it is a fact about which deck this is, not a fact about
 * the reader, and a token would put it in front of the model.
 */
const PROVENANCE = /(<span class="provenance">)[^<]*(<\/span>)/;

/** The full document for one card, ready to hand to an iframe. */
export async function cardDocument(
  html: string,
  opts: { example?: boolean } = {},
): Promise<string> {
  const css = await stylesheet();
  let out = stampLogos(fitHero(html)).replace(
    /<link rel="stylesheet" href="card\.css">/,
    `<style>${css}</style>`,
  );
  if (opts.example) out = out.replace(PROVENANCE, "$1Example ledger$2");
  return out;
}

/**
 * Just the card's own element, for a caller that is composing several onto one
 * page and wants a single copy of the stylesheet rather than twelve.
 */
export function cardFragment(html: string): string {
  return (
    /<div class="card"[\s\S]*?<\/div>\s*<\/body>/
      .exec(stampLogos(fitHero(html)))?.[0]
      .replace(/\s*<\/body>$/, "") ?? ""
  );
}

/** The stylesheet on its own, for a page that lays several fragments out. */
export function cardStylesheet(): Promise<string> {
  return stylesheet();
}
