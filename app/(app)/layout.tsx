import { auth, getUserId, isAuthConfigured } from "@/auth";
import { isDbConfigured, loadShellConnection } from "@/lib/db";
import { Sidebar, TabBar, type ShellUser } from "@/components/app/AppNav";
import { ModeScope } from "@/components/app/ModeScope";
import styles from "./app.module.css";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** The chip at the foot of the sidebar. Null when nobody is signed in. */
async function shellUser(): Promise<ShellUser | null> {
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

  const connection = isDbConfigured() ? await loadShellConnection(userId) : null;
  return { name, initials: initialsOf(name), institution: connection?.institution ?? null };
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await shellUser();
  return (
    <div className={styles.shell}>
      <ModeScope mode="light" />
      <Sidebar user={user} />
      <div className={styles.canvas}>{children}</div>
      <TabBar />
    </div>
  );
}
