import { NextResponse, type NextRequest } from "next/server";
import { getUserId } from "@/auth";
import { isValidAnswer, savePulse } from "@/lib/db";

/** One tap, once a day. Recorded, never scored — the pulse is context, not input. */
export async function POST(req: NextRequest) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: { date?: unknown; answer?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }

  const { date, answer } = body;
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }
  if (typeof answer !== "string" || !isValidAnswer(date, answer)) {
    return NextResponse.json(
      { error: "answer must be one of today's options" },
      { status: 400 },
    );
  }

  try {
    await savePulse(userId, date, answer);
    return NextResponse.json({ date, answer });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
