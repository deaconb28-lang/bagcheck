import { NextResponse } from "next/server";
import { getUserId } from "@/auth";
import { scoreUser } from "@/lib/db";

export async function POST() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const result = await scoreUser(userId);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
