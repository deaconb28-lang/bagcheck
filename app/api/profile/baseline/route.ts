import { NextResponse, type NextRequest } from "next/server";
import { getUserId } from "@/auth";
import { getCollections, scoreUser } from "@/lib/db";
import type { StyleBaseline } from "@/lib/score";

const VALID: StyleBaseline[] = ["long-term", "swing", "active"];

/** Set the style the score measures against, then rescore immediately. */
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let baseline: unknown;
  try {
    ({ baseline } = await req.json());
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  if (typeof baseline !== "string" || !VALID.includes(baseline as StyleBaseline)) {
    return NextResponse.json(
      { error: `baseline must be one of: ${VALID.join(", ")}` },
      { status: 400 },
    );
  }

  try {
    const { connections } = await getCollections();
    const result = await connections.updateOne(
      { userId },
      { $set: { styleBaseline: baseline as StyleBaseline } },
    );
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Connect a brokerage before choosing a baseline" },
        { status: 409 },
      );
    }
    const score = await scoreUser(userId);
    return NextResponse.json({ baseline, score: score.score });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
