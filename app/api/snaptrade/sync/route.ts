import { NextResponse } from "next/server";
import { getUserId } from "@/auth";
import { syncUser } from "@/lib/snaptrade";

/*
 * A full history sync is paginated network work plus a derived rebuild plus a
 * score backfill — minutes on a heavy ledger, not seconds. Without this the
 * platform default kills the process partway, and because the process is gone
 * it never writes its own failure; `getSyncProgress` reaps that case at read
 * time, but the run should be given room to finish in the first place.
 */
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const result = await syncUser(userId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
