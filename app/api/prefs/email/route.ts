import { NextResponse } from "next/server";
import { getUserId } from "@/auth";
import { getCollections, isDbConfigured } from "@/lib/db";

/** Turn the daily brief or the weekly recap on or off, for the caller only. */
export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "ledger store not configured" }, { status: 503 });
  }

  let body: { kind?: string; on?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const field = body.kind === "brief" ? "emailDaily" : body.kind === "recap" ? "emailWeekly" : null;
  if (!field || typeof body.on !== "boolean") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const { prefs } = await getCollections();
  await prefs.updateOne(
    { userId },
    { $set: { [field]: body.on, updatedAt: new Date() }, $setOnInsert: { userId } },
    { upsert: true },
  );
  return NextResponse.json({ ok: true, [field]: body.on });
}
