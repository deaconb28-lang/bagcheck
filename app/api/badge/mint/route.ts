import { NextResponse } from "next/server";
import { getUserId } from "@/auth";
import { isDbConfigured, mintBadge, tierFor } from "@/lib/db";
import { can } from "@/lib/tiers";

/** Mint (or return) the caller's live badge. One per user, on Pro. */
export async function POST() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "not signed in" }, { status: 401 });
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "ledger store not configured" }, { status: 503 });
  }
  const tier = await tierFor(userId);
  if (!can({ tier }, "liveBadge")) {
    return NextResponse.json({ error: "the live badge is a Pro format" }, { status: 403 });
  }
  const slug = await mintBadge(userId);
  return NextResponse.json({ slug, url: `/api/badge/${slug}` });
}
