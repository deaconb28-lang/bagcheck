import { redirect } from "next/navigation";
import { auth, getUserId, isAuthConfigured } from "@/auth";
import { appLocked } from "@/lib/launch";
import { AppRail, MobileTabs, type ShellUser } from "@/components/app/AppRail";
import styles from "./app.module.css";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

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

  return { name, initials: initialsOf(name) };
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Locked until launch: the app group exists but the doors are shut. The
  // landing carries the waitlist; APP_UNLOCKED=1 opens the shell again.
  if (appLocked()) redirect("/");

  const user = await shellUser();

  return (
    <div className={styles.shell} data-surface>
      {/*
        The field — the same ridge the landing page runs, drawn in CSS rather
        than loaded as an image. It renders at any size, costs nothing, has no
        CDN dependency, and can be rasterised by @vercel/og, which a JPEG
        cannot. In-product it is suppressed hard: this is an instrument, and
        the artwork is a gesture rather than a subject.
      */}
      <div className={styles.field} aria-hidden="true">
        <div className={styles.fieldRidge} />
        <div className={styles.fieldFade} />
      </div>

      <AppRail user={user} />
      <div className={styles.canvas}>{children}</div>
      <MobileTabs />
    </div>
  );
}
