"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ROUTES, SECONDARY_ROUTES } from "./nav";
import styles from "./AppNav.module.css";

export type ShellUser = {
  /** Display name, or the email local part when no name is set. */
  name: string;
  initials: string;
  /** The connected brokerage, or null when nothing is linked yet. */
  institution: string | null;
};

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/** Left sidebar — desktop. Ink field, labelled nav, user chip pinned. */
export function Sidebar({ user }: { user: ShellUser | null }) {
  const isActive = useIsActive();

  const item = ({ href, label, Mark }: (typeof ROUTES)[number] | (typeof SECONDARY_ROUTES)[number]) => {
    const active = isActive(href);
    return (
      <li key={href}>
        <Link
          href={href}
          className={styles.link}
          data-active={active || undefined}
          aria-current={active ? "page" : undefined}
        >
          <span className={styles.glyph}>
            <Mark active={active} />
          </span>
          {label}
        </Link>
      </li>
    );
  };

  return (
    <nav className={styles.side} aria-label="Sections">
      <Link href="/" className={styles.wordmark}>
        <span className={styles.wordmarkTile}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <circle
              cx="12"
              cy="12"
              r="8.6"
              fill="none"
              stroke="var(--on-ink)"
              strokeOpacity=".45"
              strokeWidth="2.8"
            />
            <path
              d="M12 3.4a8.6 8.6 0 0 1 7.4 12.9"
              fill="none"
              stroke="var(--on-ink)"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <span className={styles.wordmarkText}>Bagcheck</span>
      </Link>

      <div className={styles.context}>
        <span className={styles.contextLabel}>Ledger</span>
        <span className={styles.contextValue}>
          {user?.institution ?? "No brokerage connected"}
        </span>
      </div>

      <ul className={styles.list}>{ROUTES.map(item)}</ul>

      <div className={styles.divider} />
      <ul className={styles.list} style={{ flex: "0 0 auto", overflow: "visible" }}>
        {SECONDARY_ROUTES.map(item)}
      </ul>

      {user ? (
        <div className={styles.user}>
          <span className={styles.avatar}>{user.initials}</span>
          <span className={styles.userText}>
            <span className={styles.userName}>{user.name}</span>
            <span className={styles.userMeta}>read-only</span>
          </span>
        </div>
      ) : null}
    </nav>
  );
}

/** Bottom tab bar — below 900px. */
export function TabBar() {
  const isActive = useIsActive();
  const all = [...ROUTES, ...SECONDARY_ROUTES];
  return (
    <nav className={styles.tabs} aria-label="Sections">
      {all.map(({ href, label, Mark }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className={styles.tab}
            data-active={active || undefined}
            aria-current={active ? "page" : undefined}
          >
            <Mark active={active} />
            <span className={styles.tabLabel}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
