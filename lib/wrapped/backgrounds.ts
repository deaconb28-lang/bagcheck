import sharp from "sharp";
import { CARDS, STYLE_PREFIX } from "../../wrapped/cards.mjs";

/**
 * Drawing one Wrapped background, wherever the key happens to live.
 *
 * The generator script and the refresh route both call this, for the same
 * reason `lib/unsplash/query.ts` is split from its fetcher: the prompt is the
 * artefact, and two copies of it would drift the first time either was tuned.
 *
 * The images are drawn **once for everybody** and committed to
 * `public/wrapped/2026/backgrounds`. Nothing here runs on a page view.
 */

/** The story frame. The API renders 2:3; the card is 9:16. */
const REQUEST_SIZE = "1024x1536";
export const CARD_W = 1080;
export const CARD_H = 1920;

export function imageModel(): string {
  return process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
}

export interface BackgroundCard {
  no: string;
  key: string;
  motif: string;
}

/** The twelve, as the drawing side needs them. */
export function backgroundCards(): BackgroundCard[] {
  return (CARDS as BackgroundCard[]).map((c) => ({ no: c.no, key: c.key, motif: c.motif }));
}

/** The full prompt for one card: the shared style, then this card's motif. */
export function promptFor(card: BackgroundCard): string {
  return `${STYLE_PREFIX} ${card.motif}.`;
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
