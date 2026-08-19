import Link from "next/link";
import { SteadyhandsMark, Wordmark } from "@/components/brand/SteadyhandsMark";
import { SyncNow } from "./SyncNow";
import type { ShellUser } from "./AppRail";
import styles from "./AppNav.module.css";

export type AppTab = "dash" | "holdings" | "insights" | "wrapped" | "ledger";

const TABS: Array<{ key: AppTab; label: string; href: string }> = [
  { key: "dash", label: "Dashboard", href: "/you" },
  { key: "holdings", label: "Holdings", href: "/holdings" },
  { key: "insights", label: "Insights", href: "/insights" },
  { key: "wrapped", label: "Wrapped", href: "/wrapped" },
  /* The public ledger. A tab leads to a place, not to a settings anchor. */
  { key: "ledger", label: "Public", href: "/public" },
];

/**
 * The one row of chrome, and now the only navigation the app has.
 *
 * The product went one screen → four, so the rail argument that killed the
 * old sidebar cuts the other way: with four destinations there is something to
 * navigate between, and four words across the top is the cheapest possible way
 * to say so. The active tab is marked by a 2px amber rule that is *always
 * present* and only changes colour, so nothing shifts as you move between
 * tabs — a border that appears on hover is a layout that jumps.
 *
 * The account cluster on the right is the sync pill and the avatar, which is
 * the door to `/profile`. There is no mode switch: the app is dark, and a
 * switch whose other position is a design nobody drew is a second, worse
 * product hiding behind a button.
 */
export function AppNav({
  active,
  handle,
  accounts,
  syncedAt,
  user,
}: {
  /** Absent on settings, which is behind the avatar rather than on the bar. */
  active?: AppTab;
  /** The reader's public handle, when they have claimed one. */
  handle?: string | null;
  /** How many brokerage accounts are linked. The pill states it. */
  accounts: number;
  syncedAt: string | null;
  user?: ShellUser | null;
}) {
  return (
    <header className={styles.head}>
      <div className={styles.left}>
        <Link href="/you" className={styles.brand} aria-label="steadyhands">
          <SteadyhandsMark size={28} ground="var(--bg)" />
          <Wordmark />
        </Link>

        <nav className={styles.tabs} aria-label="Sections">
          {TABS.map((raw) => {
            const tab =
              raw.key === "ledger" && handle
                ? { ...raw, href: `/@${handle}` }
                : raw;
            return (
            <Link
              key={tab.key}
              href={tab.href}
              className={styles.tab}
              data-active={tab.key === active || undefined}
              aria-current={tab.key === active ? "page" : undefined}
            >
              {tab.label}
            </Link>
            );
          })}
        </nav>
      </div>

      <div className={styles.right}>
        <SyncNow syncedAt={syncedAt} accounts={accounts} />
        <Link
          href="/profile"
          className={styles.avatar}
          title={user ? `${user.name} — settings` : "Settings"}
        >
          {user?.initials ?? "—"}
        </Link>
      </div>
    </header>
  );
}
