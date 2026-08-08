import { Binary } from "mongodb";
import OpenAI from "openai";
import { archetypeByKey } from "@/lib/archetypes";
import { getCollections } from "@/lib/db/collections";
import { avatarPrompt } from "./prompt";

/**
 * The sixteen archetype avatars: generated once, stored, served from Mongo.
 *
 * Same shape as the icon store and for the same reasons — the image does not
 * change, the vocabulary is fixed at sixteen, and every call costs money. So
 * this is the store, not a cache in front of one, and there is no TTL.
 *
 * The key space is closed: `archetypeByKey` is the only way in, so no request
 * can turn this route into a general-purpose image generator pointed at
 * someone else's prompt.
 */

const SIZE = "1024x1024";
const MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";

export function avatarsEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

let client: OpenAI | null = null;
function openai(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not set");
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

/**
 * The stored PNG for an archetype, generating it on first request.
 *
 * Returns null on anything going wrong — an unknown key, no API key, a failed
 * generation, an unreachable database. The caller draws the emblem instead,
 * so a missing avatar is never a broken image.
 */
export async function avatarPng(key: string): Promise<Buffer | null> {
  const archetype = archetypeByKey(key);
  if (!archetype) return null;

  try {
    const { avatars } = await getCollections();
    const stored = await avatars.findOne({ key });
    if (stored) return Buffer.from(stored.png.buffer);

    if (!avatarsEnabled()) return null;

    const prompt = avatarPrompt(archetype);
    const res = await openai().images.generate({
      model: MODEL,
      prompt,
      size: SIZE,
      quality: "medium",
      output_format: "png",
      n: 1,
    });
    const b64 = res.data?.[0]?.b64_json;
    if (!b64) {
      console.error("[avatars] image response carried no data", key);
      return null;
    }

    const png = Buffer.from(b64, "base64");
    await avatars.updateOne(
      { key },
      { $set: { key, png: new Binary(png), model: MODEL, prompt, generatedAt: new Date() } },
      { upsert: true },
    );
    return png;
  } catch (err) {
    console.error("[avatars] generation failed", key, err);
    return null;
  }
}

/** Which of the sixteen already exist — used by the pre-warm script. */
export async function storedAvatarKeys(): Promise<string[]> {
  const { avatars } = await getCollections();
  const docs = await avatars.find({}).project<{ key: string }>({ _id: 0, key: 1 }).toArray();
  return docs.map((d) => d.key);
}
