"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MarkGlyph, MOBILE_ROUTES, ROUTES } from "./routes";
import { ModeToggle } from "./ModeToggle";
import styles from "./AppRail.module.css";

export type ShellUser = {
  name: string;
  initials: string;
  institution: string | null;
};

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * 76px icon rail. Native `title` tooltips are enough — a tooltip system is a
 * lot of machinery for seven words that the browser already renders.
 */
export function AppRail({ user }: { user: ShellUser | null }) {
  const isActive = useIsActive();

  return (
    <nav className={styles.rail} aria-label="Sections">
      <Link href="/home" className={styles.mark} aria-label="Bagcheck">
        <MarkGlyph />
      </Link>

      {ROUTES.map(({ href, label, Glyph }) => (
        <Link
          key={href}
          href={href}
          title={label}
          className={styles.item}
          data-active={isActive(href) || undefined}
          aria-current={isActive(href) ? "page" : undefined}
        >
          <Glyph />
          <span className={styles.sr}>{label}</span>
        </Link>
      ))}

      <div className={styles.spacer} />

      <ModeToggle />

      <Link
        href="/profile"
        title={user ? `${user.name} — settings` : "Settings"}
        className={styles.avatar}
      >
        {user?.initials ?? "—"}
      </Link>
    </nav>
  );
}

/** Bottom tab bar — below 900px. Five tabs, 48px targets. */
export function MobileTabs() {
  const isActive = useIsActive();

  return (
    <nav className={styles.tabs} aria-label="Sections">
      {MOBILE_ROUTES.map(({ href, label, Glyph }) => (
        <Link
          key={href}
          href={href}
          className={styles.tab}
          data-active={isActive(href) || undefined}
          aria-current={isActive(href) ? "page" : undefined}
        >
          <Glyph size={20} />
          <span className={styles.tabLabel}>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
