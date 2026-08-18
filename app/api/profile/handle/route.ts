import { NextResponse } from "next/server";
import { getUserId } from "@/auth";
import { ensureIndexes, getCollections, isDbConfigured } from "@/lib/db";
import { normaliseHandle } from "@/lib/db/publicLedger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Claim a handle, and decide whether it answers.
 *
 * Two fields, deliberately separate. Claiming reserves a name; `publicLedger`
 * is what makes `/@handle` return anything to a stranger. Collapsing them into
 * one switch would publish somebody's positions the moment they picked a name,
 * and publishing is an outward-facing act that has to be its own decision.
 *
 * Reserved names are refused rather than allowed to shadow a route: `/@you`
 * would be confusing next to `/you`, and a handle that reads like part of the
 * product is a handle somebody can impersonate the product with.
 */
const RESERVED = new Set([
  "you", "holdings", "insights", "wrapped", "profile", "start", "pricing",
  "admin", "api", "legal", "debug", "steadyhands", "support", "help", "settings",
]);

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "ledger store not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    handle?: unknown;
    publicLedger?: unknown;
  };

  const update: Record<string, unknown> = { userId, updatedAt: new Date() };

  if (typeof body.handle === "string") {
    const handle = normaliseHandle(body.handle);
    if (!handle) {
      return NextResponse.json(
        { error: "3–20 characters, lowercase letters, digits and underscore" },
        { status: 422 },
      );
    }
    if (RESERVED.has(handle)) {
      return NextResponse.json({ error: "that one is spoken for" }, { status: 422 });
    }
    update.handle = handle;
  }

  if (typeof body.publicLedger === "boolean") update.publicLedger = body.publicLedger;

  await ensureIndexes();
  const { prefs } = await getCollections();

  try {
    await prefs.updateOne({ userId }, { $set: update }, { upsert: true });
  } catch (err) {
    /*
     * The unique index is what decides who owns a handle, not a prior read: a
     * check-then-write would hand the same name to two people who asked at the
     * same moment. 11000 is Mongo's duplicate key.
     */
    if ((err as { code?: number })?.code === 11000) {
      return NextResponse.json({ error: "that handle is taken" }, { status: 409 });
    }
    throw err;
  }

  const saved = await prefs.findOne({ userId }, { projection: { _id: 0, handle: 1, publicLedger: 1 } });
  return NextResponse.json({
    handle: saved?.handle ?? null,
    publicLedger: Boolean(saved?.publicLedger),
  });
}
