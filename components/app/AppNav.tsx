import Link from "next/link";
import { SupercruiseMark, Wordmark } from "@/components/brand/SupercruiseMark";
import { SyncNow } from "./SyncNow";
import type { ShellUser } from "./AppRail";
import styles from "./AppNav.module.css";

export type AppTab = "dash" | "holdings" | "insights" | "trophies" | "wrapped" | "ledger";


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
  active: _active,
  handle: _handle,
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
        <Link href="/you" className={styles.brand} aria-label="supercruise">
          <SupercruiseMark size={28} />
          <Wordmark />
        </Link>

        {/*
          The tabs moved to the rail.
          
          Six labelled tabs across the top of every screen is a row of words a
          reader learns once and then never reads again, spending the head of
          the page on it every time. The rail carries the same six as marks at
          the edge; what stays here is the account cluster, which is not
          navigation — it is state.
        */}
      </div>

      <div className={styles.right}>
        {/*
          * The sync pill is a status line, and a status line is the first
          * thing to go on a phone: it is reachable on the dashboard itself
          * and it is the widest object in this bar.
          */}
        <span className={styles.sync}>
          <SyncNow syncedAt={syncedAt} accounts={accounts} />
        </span>
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
