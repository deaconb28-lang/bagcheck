import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { syncUser } from "@/lib/snaptrade";

/** Return leg of the connection portal — kick off the first sync, land on /debug. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/debug", req.url));
  }
  let synced = "1";
  try {
    await syncUser(session.user.id);
  } catch {
    // The connection may still be settling on SnapTrade's side; /debug has a
    // manual sync button for exactly this case.
    synced = "0";
  }
  return NextResponse.redirect(new URL(`/debug?connected=1&synced=${synced}`, req.url));
}
