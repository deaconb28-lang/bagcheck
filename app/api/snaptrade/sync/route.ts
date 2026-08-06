import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncUser } from "@/lib/snaptrade";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  try {
    const result = await syncUser(session.user.id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
