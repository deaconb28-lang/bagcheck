import { NextResponse } from "next/server";
import { getUserId } from "@/auth";
import { exportAccount, isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

/**
 * Everything we hold about you, as one JSON file.
 *
 * A download rather than a screen: the ledger runs to thousands of rows and
 * the point of an export is that it leaves. Nothing is summarised and nothing
 * is prettified — this is the stored shape.
 */
export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "ledger store not configured" }, { status: 503 });
  }

  const payload = await exportAccount(userId);
  const day = payload.exportedAt.slice(0, 10);

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="supercruise-export-${day}.json"`,
      "cache-control": "private, no-store",
    },
  });
}
