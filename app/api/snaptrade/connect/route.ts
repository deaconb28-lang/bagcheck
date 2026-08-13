import { NextResponse, type NextRequest } from "next/server";
import { getUserId } from "@/auth";
import { getPortalUrl } from "@/lib/snaptrade";
import { absoluteUrl } from "@/lib/origin";

/**
 * Browser-navigable: redirects into the SnapTrade connection portal.
 *
 * **Every exit from here is a screen, never a payload.** This is reached by
 * navigating, so a JSON body or a bare 500 is a dead end with no way back —
 * which is exactly what someone means when they say nothing happened. Both
 * failure paths now return to `/start`, which knows how to say what went
 * wrong and what to do about it.
 */
export async function GET(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.redirect(absoluteUrl(req, "/start?error=session"));
  }
  try {
    const callback = absoluteUrl(req, "/api/snaptrade/callback");
    const portalUrl = await getPortalUrl(userId, callback);
    return NextResponse.redirect(portalUrl);
  } catch (err) {
    // The reason goes to the server log; the screen gets a code it can speak.
    console.error("[snaptrade] portal session failed", err);
    return NextResponse.redirect(absoluteUrl(req, "/start?error=portal"));
  }
}
