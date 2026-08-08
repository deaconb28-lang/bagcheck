import { getUserId } from "@/auth";
import { isDbConfigured } from "@/lib/db";
import { isMode, saveMode } from "@/lib/db/prefs";

export const runtime = "nodejs";

/** Persist the display mode. Server-authoritative on who, never on what. */
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  if (!isDbConfigured()) return new Response("No store", { status: 503 });

  const body = await req.json().catch(() => null);
  const mode = (body as { mode?: unknown } | null)?.mode;
  if (!isMode(mode)) return new Response("Bad mode", { status: 400 });

  await saveMode(userId, mode);
  return Response.json({ mode });
}
