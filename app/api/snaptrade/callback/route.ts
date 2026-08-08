import { NextResponse, type NextRequest } from "next/server";
import { getUserId } from "@/auth";

/**
 * Return leg of the connection portal.
 *
 * It no longer runs the sync. The sync used to happen here, inline, which
 * meant the user stared at a redirect for however long their brokerage took
 * and arrived at a finished screen with no idea what had happened. Now the
 * redirect is immediate and `<SyncDialog>` on /home starts the sync and
 * reports it phase by phase — the first thing a new user watches is three
 * years of their own history landing.
 */
export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.redirect(new URL("/home", req.url));
  }
  return NextResponse.redirect(new URL("/home?connected=1", req.url));
}
