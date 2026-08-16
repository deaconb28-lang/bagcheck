import { auth, getUserId, isAuthConfigured } from "@/auth";
import type { ShellUser } from "./AppRail";

/**
 * Who is signed in, for the header's avatar.
 *
 * It lived in `app/(app)/layout.tsx` while the rail did, and moved out when the
 * rail did: a layout file may only export a layout and Next's own handful of
 * fields, so a helper beside one is a build error waiting for the first import.
 */
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export async function shellUser(): Promise<ShellUser | null> {
  const userId = await getUserId();
  if (!userId) return null;

  let name = "You";
  if (isAuthConfigured()) {
    try {
      const session = await auth();
      const raw = session?.user?.name || session?.user?.email?.split("@")[0];
      if (raw) name = raw;
    } catch (err) {
      console.error("[shell] session lookup failed", err);
    }
  }

  return { name, initials: initialsOf(name) };
}

