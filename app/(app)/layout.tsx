import { auth, getUserId, isAuthConfigured } from "@/auth";
import { isDbConfigured, loadShellConnection } from "@/lib/db";
import { DEFAULT_MODE, modeFor } from "@/lib/db/prefs";
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

  const connection = isDbConfigured() ? await loadShellConnection(userId) : null;
  return { name, initials: initialsOf(name), institution: connection?.institution ?? null };
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await getUserId();
  const [user, mode] = await Promise.all([
    shellUser(),
    userId && isDbConfigured() ? modeFor(userId) : Promise.resolve(DEFAULT_MODE),
  ]);

  return (
    <div className={styles.shell} data-surface>
      {/*
        Set before paint rather than in an effect: the mode lives on the user
        document, so the server already knows it, and a client effect would
        show one frame of the wrong mode on every navigation into the app.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.dataset.mode=${JSON.stringify(mode)}`,
        }}
      />

      {/*
        The field. A fixed, slowly drifting backdrop faded almost out — the
        one warm gesture in an instrument aesthetic, and it is motion rather
        than ornament. Committed locally: hot-linking it would break the
        share-card renderer, which has to draw it to a canvas.
      */}
      <div className={styles.field} aria-hidden="true">
        <div className={styles.fieldArt} />
        <div className={styles.fieldFade} />
      </div>

      <AppRail user={user} />
      <div className={styles.canvas}>{children}</div>
      <MobileTabs />
    </div>
  );
}
