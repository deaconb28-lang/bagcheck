import { NextResponse, type NextRequest } from "next/server";
import { getUserId } from "@/auth";
import { absoluteUrl } from "@/lib/origin";

/**
 * Return leg of the connection portal.
 *
 * **It lands on the Wrapped screen, not the dashboard.** Someone who has just
 * linked a brokerage came here for their year, and `/wrapped` is where the
 * first sync now runs and reports itself — the reader watches their own
 * history arrive and the cards appear underneath it, on one screen.
 *
 * It does not run the sync itself. The sync used to happen here, inline, which
 * meant staring at a redirect for however long the brokerage took and arriving
 * at a finished screen with no idea what had happened.
 *
 * A visitor who lost their session on the round trip goes back to `/start`
 * rather than to a signed-out Wrapped, because the next move there is signing
 * in again and nothing on Wrapped would say so.
 */
export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.redirect(absoluteUrl(req, "/start?error=session"));
  }
  return NextResponse.redirect(absoluteUrl(req, "/wrapped?connected=1"));
}
