import sharp from "sharp";
import { CARDS, COMPOSITION, CONSTRAINTS } from "../../wrapped/cards.mjs";

/**
 * Drawing one Wrapped background, wherever the key happens to live.
 *
 * The generator script and the refresh route both call this, for the same
 * reason `lib/unsplash/query.ts` is split from its fetcher: the prompt is the
 * artefact, and two copies of it would drift the first time either was tuned.
 *
 * The images are drawn **once for everybody** and committed to
 * `public/wrapped/2026/art/chaotic-01`. Nothing here runs on a page view.
 */

/** The story frame. The API renders 2:3; the card is 9:16. */
const REQUEST_SIZE = "1024x1536";
export const CARD_W = 1080;
export const CARD_H = 1920;

export function imageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
}

export interface CardArt {
  /** The medium the card is drawn in — chrome, riso, terrazzo, foil. */
  medium: string;
  /** How the surface behaves under light. */
  texture: string;
  /** Named colours, not hexes: a model reads "canary yellow", not #FCE300. */
  palette: string;
}

export interface BackgroundCard {
  no: string;
  key: string;
  motif: string;
  art: CardArt;
}

/** The twelve, as the drawing side needs them. */
export function backgroundCards(): BackgroundCard[] {
  return (CARDS as BackgroundCard[]).map((c) => ({
    no: c.no,
    key: c.key,
    motif: c.motif,
    art: c.art,
  }));
}

/**
 * The full prompt for one card.
 *
 * Medium first, because it is the thing that makes card five look nothing
 * like card four — an image model weights the opening of a prompt hardest,
 * and "halftone pop-art print" up front produces a different object from the
 * same subject described after four lines of shared house style. Only the
 * composition and the prohibitions are shared, and both are about keeping the
 * type legible rather than about how the card looks.
 *
 * The variation is **across the twelve and not across readers**: card five is
 * the same art direction for everybody, the way a Wrapped template is. What
 * makes a card someone's own is the figure set over it in type.
 */
export function promptFor(card: BackgroundCard): string {
  const { medium, texture, palette } = card.art;
  return [
    `${medium}.`,
    `Subject: ${card.motif}.`,
    `Palette: ${palette}.`,
    `Surface: ${texture}.`,
    COMPOSITION,
    CONSTRAINTS,
  ].join(" ");
}

/**
 * Draw it. Returns PNG bytes at card size, or throws with the provider's own
 * complaint — a caller that cannot say why an image is missing is a caller
 * that will be asked to run again for no reason.
 */
export async function drawBackground(card: BackgroundCard): Promise<Buffer> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: imageModel(),
      prompt: promptFor(card),
      size: REQUEST_SIZE,
      quality: "high",
      n: 1,
    }),
  });

  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 300)}`);

  const b64 = (await res.json())?.data?.[0]?.b64_json;
  if (!b64) throw new Error("response carried no image data");

  /*
   * Cover, not stretch. Something has to give between 2:3 and 9:16, and a
   * gradient that has been squashed reads as a mistake in a way a gradient
   * that has been cropped does not.
   */
  return sharp(Buffer.from(b64, "base64"))
    .resize(CARD_W, CARD_H, { fit: "cover" })
    .png()
    .toBuffer();
}
