import { Binary } from "mongodb";
import OpenAI from "openai";
import { getCollections } from "@/lib/db/collections";
import { SCENE } from "./scenes";
import { artPromptFor, briefKey } from "./brief";
import type { ArtBrief } from "./brief";
import type { CardSpec } from "@/lib/cards/kinds";

/**
 * A card's artwork, drawn from that card's own numbers.
 *
 * OpenAI draws; Anthropic still writes every sentence in the product. And
 * within the drawing, the split holds one more time: **the model composes the
 * picture, we set every word and every number over it.** A generated "412" is
 * a figure nobody can correct after the fact, on an artefact whose entire
 * claim is that its numbers came from a brokerage.
 *
 * Generated at mint and stored, never on read — a share card has to look
 * identical every time someone opens the link, and a page view must not
 * depend on an image model being up.
 *
 * **Cached by brief, not by user.** `briefKey` bands the four measured
 * quantities, so two people whose cards genuinely look the same share one
 * image and one bill, while a card whose numbers moved into a new band draws
 * a new one. At ~$0.04 a picture and twelve kinds, minting every card fresh
 * for every user would be the single largest line in the model.
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

/** 2:3, matching the card. */
const SIZE = "1024x1536";
const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";

/** The brief for a card, ready to draw. */
export function briefFor(card: CardSpec): ArtBrief {
  return { kind: card.kind, hue: card.hue, scene: SCENE[card.kind], shape: card.art };
}

/**
 * Returns null rather than throwing on any failure. A card without art is the
 * flat hue field, which is a complete card — the picture is an enhancement
 * and is never allowed to block a mint.
 */
export async function generateCardArt(card: CardSpec): Promise<GeneratedArt | null> {
  if (!isImageGenConfigured()) return null;

  const brief = briefFor(card);
  const key = briefKey(brief);
  const prompt = artPromptFor(brief);

  try {
    const { cardArtCache } = await getCollections();
    const hit = await cardArtCache.findOne({ key });
    if (hit) return { png: Buffer.from(hit.png.buffer), model: hit.model, prompt: hit.prompt };

    const res = await openai().images.generate({
      model: MODEL,
      prompt,
      size: SIZE,
      quality: "medium",
      // PNG rather than webp: Satori renders the card image and cannot decode webp.
      output_format: "png",
      n: 1,
    });

    const b64 = res.data?.[0]?.b64_json;
    if (!b64) {
      console.error("[wrapped] image response carried no data", key);
      return null;
    }
    const png = Buffer.from(b64, "base64");

    await cardArtCache
      .updateOne(
        { key },
        { $set: { key, png: new Binary(png), model: MODEL, prompt, drawnAt: new Date() } },
        { upsert: true },
      )
      .catch((err) => console.error("[wrapped] art cache write failed", err));

    return { png, model: MODEL, prompt };
  } catch (err) {
    console.error("[wrapped] art generation failed", key, err);
    return null;
  }
}
