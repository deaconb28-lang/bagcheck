import { NextResponse } from "next/server";
import { getUserId } from "@/auth";
import { getSyncProgress } from "@/lib/db/sync-progress";

export const dynamic = "force-dynamic";

/**
 * What the onboarding dialog polls while the sync POST is still open.
 *
 * Scoped to the caller's own userId — the sync board is per-user and there is
 * no path here that takes one as a parameter.
 */
export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const progress = await getSyncProgress(userId);
  return NextResponse.json(
    { progress },
    { headers: { "cache-control": "no-store" } },
  );
}
