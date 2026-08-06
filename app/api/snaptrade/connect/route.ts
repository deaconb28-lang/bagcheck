import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { getPortalUrl } from "@/lib/snaptrade";

/** Browser-navigable: redirects into the SnapTrade connection portal. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/debug", req.url));
  }
  try {
    const callback = new URL("/api/snaptrade/callback", req.url).toString();
    const portalUrl = await getPortalUrl(session.user.id, callback);
    return NextResponse.redirect(portalUrl);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
