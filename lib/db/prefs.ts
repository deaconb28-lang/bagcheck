import { getCollections } from "./collections";

export type Mode = "light" | "dark";

/**
 * Dark is a first-class mode and the default for someone who has never
 * chosen — the instrument reads better on the ink field, and the light
 * variant is the deliberate opt-out rather than the other way round.
 */
export const DEFAULT_MODE: Mode = "dark";

export function isMode(value: unknown): value is Mode {
  return value === "light" || value === "dark";
}

export async function modeFor(userId: string | null): Promise<Mode> {
  if (!userId) return DEFAULT_MODE;
  try {
    const { prefs } = await getCollections();
    const doc = await prefs.findOne({ userId });
    return isMode(doc?.mode) ? doc.mode : DEFAULT_MODE;
  } catch (err) {
    // A preference is not worth failing a page render over.
    console.error("[prefs] read failed", err);
    return DEFAULT_MODE;
  }
}

export async function saveMode(userId: string, mode: Mode): Promise<void> {
  const { prefs } = await getCollections();
  await prefs.updateOne(
    { userId },
    { $set: { mode, updatedAt: new Date() }, $setOnInsert: { userId } },
    { upsert: true },
  );
}
