import { NextResponse, type NextRequest } from "next/server";
import { getCollections, isDbConfigured } from "@/lib/db";
import { unsubscribeSecret, verify } from "@/lib/email/token";

export const dynamic = "force-dynamic";

/**
 * Turn every email off for one user.
 *
 * Reachable without a session, because the link is opened by a mail client —
 * so the id is signed and the signature is what authorises the change. A
 * valid token does exactly one thing and reads nothing.
 *
 * POST exists for RFC 8058 one-click unsubscribe, which mail providers call
 * without ever loading the page; GET exists for the person who clicked the
 * link and expects to land somewhere that says it worked.
 */
async function unsubscribe(req: NextRequest): Promise<boolean> {
  const secret = unsubscribeSecret();
  const userId = req.nextUrl.searchParams.get("u");
  const token = req.nextUrl.searchParams.get("t");
  if (!secret || !userId || !token || !verify(userId, token, secret)) return false;
  if (!isDbConfigured()) return false;

  const { prefs } = await getCollections();
  await prefs.updateOne(
    { userId },
    { $set: { emailDaily: false, emailWeekly: false, updatedAt: new Date() }, $setOnInsert: { userId } },
    { upsert: true },
  );
  return true;
}

export async function POST(req: NextRequest) {
  const ok = await unsubscribe(req);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}

export async function GET(req: NextRequest) {
  const ok = await unsubscribe(req);
  return NextResponse.redirect(
    new URL(ok ? "/profile?email=off" : "/profile?email=failed", req.url),
  );
}
