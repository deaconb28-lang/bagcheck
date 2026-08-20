import { after, NextResponse } from "next/server";
import { getUserId } from "@/auth";
import { syncUser } from "@/lib/snaptrade";
import { warmUser } from "@/lib/db/warm";

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

    /*
     * Build the year the moment the ledger lands, not the first time somebody
     * asks for it.
     *
     * The deck was built lazily by whoever opened `/wrapped` first, which put
     * the slowest thing in the product directly in front of the reader at the
     * exact moment it is most worth showing them — the minute after they
     * connect. `warmUser` is the same call the nightly job makes, so this
     * fills the same cached row under the same key rather than computing a
     * second answer to one question.
     *
     * `after()` runs it once the response is on its way, so the sync dialog
     * still hears "done" the instant the sync is done. Swallowed: a deck that
     * fails to pre-build is a slow first open, not a failed sync.
     */
    after(async () => {
      try {
        await warmUser(userId);
      } catch (err) {
        console.error("[sync] warm failed", err);
      }
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
