"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MarkGlyph, MOBILE_ROUTES, ROUTES } from "./routes";
import { ModeSwitch } from "./ModeSwitch";
import styles from "./AppRail.module.css";

export type ShellUser = {
  name: string;
  initials: string;
};

function useIsActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The rail. Three routes, each with its glyph and its name.
 *
 * It was 76px and icon-only, with a native `title` doing the explaining —
 * which is a tooltip nobody hovers for, on a product where the three
 * destinations are not self-evident from a drawn mark. Three items is far too
 * few to need the space back, so they say what they are.
 */
export function AppRail({ user }: { user: ShellUser | null }) {
  const isActive = useIsActive();

  return (
    <nav className={styles.rail} aria-label="Sections">
      <Link href="/you" className={styles.mark} aria-label="Canopy">
        <MarkGlyph />
      </Link>

      {ROUTES.map(({ href, label, Glyph }) => (
        <Link
          key={href}
          href={href}
          className={styles.item}
          data-active={isActive(href) || undefined}
          aria-current={isActive(href) ? "page" : undefined}
        >
          <Glyph />
          <span className={styles.label}>{label}</span>
        </Link>
      ))}

      <div className={styles.spacer} />

      <div className={styles.foot}>
        <Link
          href="/profile"
          title={user ? `${user.name} — settings` : "Settings"}
          className={styles.avatar}
        >
          {user?.initials ?? "—"}
        </Link>
        {user ? <span className={styles.who}>{user.name}</span> : <span className={styles.spacer} />}
        <ModeSwitch />
      </div>
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
