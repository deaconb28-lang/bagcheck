import OpenAI from "openai";
import { artPrompt, type WrappedYear } from "./prompt";

/**
 * Wrapped artwork, generated once and stored.
 *
 * OpenAI draws the backdrop; Anthropic still writes every sentence in the
 * product. A card is generated at mint time and never on read — a share card
 * has to look identical every time someone opens the link, and a page view
 * must not depend on an image model being up.
 */

export function isImageGenConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

let client: OpenAI | null = null;
function openai(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

export interface GeneratedArt {
  png: Buffer;
  model: string;
  prompt: string;
}

/** Landscape, to match the 1200x630 the card unfurls at. */
const SIZE = "1536x1024";
const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";

/**
 * Returns null rather than throwing on any failure. Wrapped without a
 * backdrop is the flat ink card, which is a perfectly good card — the art is
 * an enhancement and is never allowed to block a mint.
 */
export async function generateWrappedArt(
  year: WrappedYear,
): Promise<GeneratedArt | null> {
  if (!isImageGenConfigured()) return null;

  const prompt = artPrompt(year);
  try {
    const res = await openai().images.generate({
      model: MODEL,
      prompt,
      size: SIZE,
      quality: "medium",
      // PNG rather than webp: the card image is rendered by Satori, which
      // does not decode webp.
      output_format: "png",
      n: 1,
    });

    const b64 = res.data?.[0]?.b64_json;
    if (!b64) {
      console.error("[wrapped] image response carried no data");
      return null;
    }
    return { png: Buffer.from(b64, "base64"), model: MODEL, prompt };
  } catch (err) {
    console.error("[wrapped] art generation failed", err);
    return null;
  }
}
